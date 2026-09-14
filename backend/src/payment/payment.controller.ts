import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /payment/checkout
   * Create Stripe checkout session from cart
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(@Req() req: any, @Body() dto: CreateCheckoutDto) {
    const userId = req.user.sub; // JWT payload has 'sub' not 'id'
    this.logger.log(`Checkout request from user ${userId}`);
    
    return this.paymentService.createCheckoutSession(userId, dto);
  }

  /**
   * POST /payment/webhook
   * Stripe webhook endpoint - receives payment events
   * 
   * IMPORTANT: This endpoint receives RAW body via express.raw() middleware
   * The raw buffer is in req.body (not req.rawBody)
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any, // Use any to access body as Buffer
  ) {
    this.logger.log('📥 Webhook received from Stripe');
    this.logger.log(`Signature header: ${signature ? 'Present' : 'MISSING'}`);
    this.logger.log(`Signature value: ${signature}`);
    this.logger.log(`Body type: ${req.body ? typeof req.body : 'MISSING'}`);
    this.logger.log(`Body is Buffer: ${Buffer.isBuffer(req.body)}`);
    this.logger.log(`Body length: ${req.body ? req.body.length : 0}`);
    this.logger.log(`rawBody exists: ${!!req.rawBody}`);
    this.logger.log(`rawBody is Buffer: ${Buffer.isBuffer(req.rawBody)}`);

    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      return { received: false, error: 'Missing signature' };
    }

    // Try both req.body and req.rawBody
    const rawBody = req.rawBody || req.body;

    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      this.logger.error(`Body is not a Buffer - type: ${typeof rawBody}`);
      return { received: false, error: 'Raw body required' };
    }

    try {
      await this.paymentService.handleWebhook(signature, rawBody);
      
      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      return { received: false, error: error.message };
    }
  }

  /**
   * GET /payment/orders/:orderId
   * Get specific order details
   */
  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  async getOrder(@Req() req: any, @Param('orderId') orderId: string) {
    const userId = req.user.sub; // JWT payload has 'sub' not 'id'
    return this.paymentService.getOrder(orderId, userId);
  }

  /**
   * GET /payment/orders
   * Get user's order history
   */
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getUserOrders(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    const userId = req.user.sub; // JWT payload has 'sub' not 'id'
    return this.paymentService.getUserOrders(
      userId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
    );
  }

  /**
   * GET /payment/test
   * Test endpoint to verify payment module is loaded
   */
  @Get('test')
  testPayment() {
    return {
      success: true,
      message: 'Payment module is working',
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    };
  }

  /**
   * POST /payment/orders/:orderId/cancel
   * Cancel a pending order
   */
  @Post('orders/:orderId/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelOrder(@Req() req: any, @Param('orderId') orderId: string) {
    const userId = req.user.sub;
    return this.paymentService.cancelOrder(orderId, userId);
  }

  /**
   * POST /payment/orders/:orderId/complete-manual
   * Manually complete an order (for testing/debugging webhook issues)
   * TEMPORARY - Remove in production
   */
  @Post('orders/:orderId/complete-manual')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async manuallyCompleteOrder(@Req() req: any, @Param('orderId') orderId: string) {
    const userId = req.user.sub;
    return this.paymentService.manuallyCompleteOrder(orderId, userId);
  }
}
