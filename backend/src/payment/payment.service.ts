import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Stripe from 'stripe';
import { OrderEntity, OrderStatus } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { PaymentEntity, PaymentStatus } from './entities/payment.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { PurchaseEntity } from '../purchases/entities/purchase.entity';
import { MailService } from '../mail/mail.service';
import { CreateCheckoutDto, CheckoutSessionResponse } from './dto/create-checkout.dto';
import { OrderResponseDto } from './dto/order.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(OrderEntity)
    private orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private orderItemRepository: Repository<OrderItemEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(PurchaseEntity)
    private purchaseRepository: Repository<PurchaseEntity>,
    private mailService: MailService,
  ) {
    // Initialize Stripe with secret key
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2026-08-26.dahlia', // Use the expected API version
    });
    this.logger.log('✅ Stripe initialized');
  }

  /**
   * Create Stripe Checkout Session for cart resources
   */
  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutDto,
  ): Promise<CheckoutSessionResponse> {
    this.logger.log(`Creating checkout session for user ${userId} with ${dto.resourceIds.length} resources`);

    // 1. Validate and fetch all resources
    const resources = await this.documentRepository.find({
      where: { id: In(dto.resourceIds) },
      relations: ['user'], // Get teacher info
    });

    if (resources.length !== dto.resourceIds.length) {
      throw new BadRequestException('Some resources not found');
    }

    // 2. Validate all resources are paid
    const invalidResources = resources.filter(r => r.license !== 'paid' || !r.price || r.price <= 0);
    if (invalidResources.length > 0) {
      throw new BadRequestException(
        `Resources not available for purchase: ${invalidResources.map(r => r.title).join(', ')}`
      );
    }

    // 3. Check for already purchased resources
    const existingPurchases = await this.purchaseRepository.find({
      where: {
        userId,
        documentId: In(dto.resourceIds),
        status: 'completed',
      },
    });

    if (existingPurchases.length > 0) {
      const alreadyPurchasedTitles = resources
        .filter(r => existingPurchases.some(p => p.documentId === r.id))
        .map(r => r.title)
        .join(', ');
      throw new BadRequestException(
        `You have already purchased: ${alreadyPurchasedTitles}`
      );
    }

    // 4. Calculate total amount (server-side validation)
    const totalAmount = resources.reduce((sum, r) => sum + Number(r.price), 0);
    
    this.logger.log(`Cart validated: ${resources.length} items, total: ${totalAmount} TND`);

    // 5. Create Order in database with PENDING status
    const order = this.orderRepository.create({
      userId,
      totalAmount,
      currency: 'EUR', // Use EUR instead of TND (Stripe doesn't support TND yet)
      status: 'pending' as OrderStatus,
    });
    const savedOrder = await this.orderRepository.save(order);

    // 6. Create Order Items
    const orderItems = resources.map(resource =>
      this.orderItemRepository.create({
        orderId: savedOrder.id,
        resourceId: resource.id,
        resourceType: 'document',
        price: Number(resource.price || 0),
        teacherId: resource.userId,
      })
    );
    await this.orderItemRepository.save(orderItems);

    this.logger.log(`Order ${savedOrder.id} created with ${orderItems.length} items`);

    // 7. Create Stripe Checkout Session line items
    // IMPORTANT: Stripe uses smallest currency unit
    // For EUR (2 decimal places), multiply by 100
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = resources.map(resource => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: resource.title || resource.originalName,
          description: `Educational resource - ${resource.title}`,
          metadata: {
            resourceId: resource.id,
            teacherId: resource.userId,
          },
        },
        unit_amount: Math.round(Number(resource.price) * 100), // EUR uses 2 decimal places (cents)
      },
      quantity: 1,
    }));

    // 8. Create Stripe Checkout Session
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
      customer_email: (await this.userRepository.findOne({ where: { id: userId } }))?.email,
      metadata: {
        userId,
        orderId: savedOrder.id,
      },
      payment_intent_data: {
        metadata: {
          userId,
          orderId: savedOrder.id,
        },
      },
    });

    // 9. Update order with Stripe session ID
    savedOrder.stripeSessionId = session.id;
    await this.orderRepository.save(savedOrder);

    this.logger.log(`✅ Stripe session created: ${session.id}`);

    return {
      checkoutUrl: session.url || '',
      sessionId: session.id,
      orderId: savedOrder.id,
    };
  }

  /**
   * Handle Stripe Webhook Events
   * This is where the REAL payment processing happens
   */
  async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
    let event: Stripe.Event;

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    this.logger.log(`Using webhook secret: ${webhookSecret.substring(0, 10)}...`);
    this.logger.log(`Signature format check: ${signature.includes('t=') && signature.includes('v1=')}`);

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
      this.logger.log(`✅ Webhook verified: ${event.type}`);
    } catch (err) {
      this.logger.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      this.logger.error(`Signature received: ${signature}`);
      this.logger.error(`Body length: ${rawBody.length}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Handle specific events
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle successful checkout session completion
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    this.logger.log(`Processing completed checkout session: ${session.id}`);

    const orderId = session.metadata?.orderId;
    if (!orderId) {
      this.logger.error('No orderId in session metadata');
      return;
    }

    // Find order
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.resource', 'items.teacher'],
    });

    if (!order) {
      this.logger.error(`Order not found: ${orderId}`);
      return;
    }

    // Update order status
    order.status = 'paid' as OrderStatus;
    order.stripePaymentIntentId = session.payment_intent as string;
    order.completedAt = new Date();
    await this.orderRepository.save(order);

    this.logger.log(`✅ Order ${orderId} marked as PAID`);

    // Grant access to all resources
    await this.grantResourceAccess(order);

    // Send notifications
    await this.sendPurchaseNotifications(order);
  }

  /**
   * Handle successful payment intent
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);

    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) return;

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    // Create payment record
    const payment = this.paymentRepository.create({
      orderId: order.id,
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert from cents back to EUR
      currency: 'EUR',
      status: 'succeeded' as PaymentStatus,
      paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
      stripeChargeId: paymentIntent.latest_charge as string,
    });

    await this.paymentRepository.save(payment);
    this.logger.log(`✅ Payment record created for order ${orderId}`);
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.error(`Payment failed: ${paymentIntent.id}`);

    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) return;

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    // Update order status to failed
    order.status = 'failed' as OrderStatus;
    await this.orderRepository.save(order);

    // Create failed payment record
    const payment = this.paymentRepository.create({
      orderId: order.id,
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: 'EUR',
      status: 'failed' as PaymentStatus,
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
    });

    await this.paymentRepository.save(payment);
  }

  /**
   * Grant access to purchased resources
   * Creates purchase records in the purchases table
   */
  private async grantResourceAccess(order: OrderEntity) {
    this.logger.log(`Granting access for order ${order.id}`);

    const purchases: PurchaseEntity[] = [];

    for (const item of order.items) {
      const purchase = this.purchaseRepository.create({
        userId: order.userId,
        documentId: item.resourceId,
        amount: Number(item.price),
        currency: 'EUR', // Match order currency
        paymentMethod: 'stripe',
        transactionId: order.stripePaymentIntentId || `ORDER-${order.id}`,
        status: 'completed',
        orderId: order.id,
        stripeSessionId: order.stripeSessionId || undefined,
      });

      purchases.push(purchase);
    }

    await this.purchaseRepository.save(purchases);
    this.logger.log(`✅ Access granted: ${purchases.length} resources`);
  }

  /**
   * Send email notifications to buyer and teachers
   */
  private async sendPurchaseNotifications(order: OrderEntity) {
    try {
      // Get buyer info (can be student OR teacher)
      const buyer = await this.userRepository.findOne({ where: { id: order.userId } });
      if (!buyer) return;

      // Send purchase confirmation to buyer
      for (const item of order.items) {
        await this.mailService.sendPurchaseConfirmation(
          buyer.email,
          buyer.fullName,
          item.resource.title || item.resource.originalName,
          item.price,
          order.id,
          item.resourceId,
        );
      }

      this.logger.log(`📧 Purchase confirmation sent to ${buyer.email}`);

      // Send sale notifications to resource creators (teachers)
      const teacherIds = [...new Set(order.items.map(item => item.teacherId))];
      
      for (const teacherId of teacherIds) {
        const teacher = await this.userRepository.findOne({ where: { id: teacherId } });
        if (!teacher) continue;

        const teacherItems = order.items.filter(item => item.teacherId === teacherId);
        const teacherRevenue = teacherItems.reduce((sum, item) => sum + Number(item.price), 0);

        // Send notification for each resource
        for (const item of teacherItems) {
          await this.mailService.sendSaleNotification(
            teacher.email,
            teacher.fullName,
            item.resource.title || item.resource.originalName,
            buyer.fullName,
            item.price,
            item.resourceId,
          );
        }

        this.logger.log(`📧 Sale notification sent to teacher ${teacher.email} (${teacherRevenue} EUR)`);
      }
    } catch (error) {
      this.logger.error(`Failed to send notifications: ${error.message}`);
    }
  }

  /**
   * Get order by ID with all details
   */
  async getOrder(orderId: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['items', 'items.resource', 'items.teacher'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.id,
      userId: order.userId,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      status: order.status,
      createdAt: order.createdAt,
      completedAt: order.completedAt || undefined,
      items: order.items.map(item => ({
        id: item.id,
        resourceId: item.resourceId,
        resourceType: item.resourceType,
        resourceTitle: item.resource?.title || 'Unknown',
        price: Number(item.price),
        teacherId: item.teacherId,
        teacherName: item.teacher?.fullName || 'Unknown',
      })),
    };
  }

  /**
   * Get user's order history
   */
  async getUserOrders(userId: string, page: number = 1, pageSize: number = 10) {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId },
      relations: ['items', 'items.resource', 'items.teacher'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      orders: orders.map(order => ({
        id: order.id,
        userId: order.userId,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        status: order.status,
        createdAt: order.createdAt,
        completedAt: order.completedAt || undefined,
        items: order.items.map(item => ({
          id: item.id,
          resourceId: item.resourceId,
          resourceType: item.resourceType,
          resourceTitle: item.resource?.title || 'Unknown',
          price: Number(item.price),
          teacherId: item.teacherId,
          teacherName: item.teacher?.fullName || 'Unknown',
        })),
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Cancel a pending order
   */
  async cancelOrder(orderId: string, userId: string) {
    // Find the order
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only pending orders can be cancelled
    if (order.status !== 'pending') {
      throw new BadRequestException(`Cannot cancel order with status: ${order.status}`);
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    order.updatedAt = new Date();
    await this.orderRepository.save(order);

    this.logger.log(`Order ${orderId} cancelled by user ${userId}`);

    return {
      success: true,
      message: 'Order cancelled successfully',
      orderId: order.id,
    };
  }

  /**
   * Manually complete an order (for testing/debugging webhook issues)
   * TEMPORARY - Remove in production
   */
  async manuallyCompleteOrder(orderId: string, userId: string) {
    // Find the order with items
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['items', 'items.resource', 'items.teacher'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only pending orders can be manually completed
    if (order.status !== 'pending') {
      throw new BadRequestException(`Cannot complete order with status: ${order.status}`);
    }

    // Update order status to paid
    order.status = 'paid';
    order.completedAt = new Date();
    order.updatedAt = new Date();
    await this.orderRepository.save(order);

    this.logger.log(`Order ${orderId} manually completed by user ${userId}`);

    // Grant access to resources
    await this.grantResourceAccess(order);

    // Send notifications
    await this.sendPurchaseNotifications(order);

    return {
      success: true,
      message: 'Order completed successfully',
      orderId: order.id,
    };
  }
}
