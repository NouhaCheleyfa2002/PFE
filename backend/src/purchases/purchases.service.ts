import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseEntity } from './entities/purchase.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectRepository(PurchaseEntity)
    private purchaseRepository: Repository<PurchaseEntity>,
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private mailService: MailService,
  ) {}

  // Check if user has already purchased a document
  async hasPurchased(userId: string, documentId: string): Promise<boolean> {
    const purchase = await this.purchaseRepository.findOne({
      where: {
        userId,
        documentId,
        status: 'completed',
      },
    });
    return !!purchase;
  }

  // Create a fake purchase (simulated payment)
  async createPurchase(userId: string, documentId: string, paymentMethod: string = 'card') {
    // Check if document exists and is paid
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.license !== 'paid') {
      throw new BadRequestException('This document is not available for purchase');
    }

    if (!document.price || document.price <= 0) {
      throw new BadRequestException('Invalid document price');
    }

    // Check if user already purchased
    const alreadyPurchased = await this.hasPurchased(userId, documentId);
    if (alreadyPurchased) {
      throw new BadRequestException('You have already purchased this document');
    }

    // Create fake transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create purchase record
    const purchase = this.purchaseRepository.create({
      userId,
      documentId,
      amount: document.price,
      currency: 'TND',
      paymentMethod,
      transactionId,
      status: 'completed',
    });

    const savedPurchase = await this.purchaseRepository.save(purchase);

    // Send purchase confirmation email to buyer
    try {
      const buyer = await this.userRepository.findOne({ where: { id: userId } });
      if (buyer) {
        await this.mailService.sendPurchaseConfirmation(
          buyer.email,
          buyer.fullName,
          document.title || document.originalName,
          document.price,
          transactionId,
          documentId
        );
        this.logger.log(`Purchase confirmation email sent to: ${buyer.email}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send purchase confirmation email: ${error.message}`);
    }

    // Send sale notification email to seller
    try {
      const seller = await this.userRepository.findOne({ where: { id: document.userId } });
      const buyer = await this.userRepository.findOne({ where: { id: userId } });
      if (seller && buyer) {
        await this.mailService.sendSaleNotification(
          seller.email,
          seller.fullName,
          document.title || document.originalName,
          buyer.fullName,
          document.price,
          documentId
        );
        this.logger.log(`Sale notification email sent to: ${seller.email}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send sale notification email: ${error.message}`);
    }

    return {
      success: true,
      purchase: savedPurchase,
      document: {
        id: document.id,
        title: document.title,
        price: document.price,
      },
    };
  }

  // Process bulk checkout from cart
  async processCheckout(
    userId: string,
    purchases: Array<{ documentId: string; quantity: number; price: number }>,
  ) {
    const results: Array<{
      documentId: string;
      title: string;
      amount: number;
      purchase: PurchaseEntity;
    }> = [];
    
    const errors: Array<{
      documentId: string;
      error: string;
    }> = [];
    
    let totalAmount = 0;

    // Process each purchase
    for (const item of purchases) {
      try {
        // Check if already purchased
        const alreadyPurchased = await this.hasPurchased(userId, item.documentId);
        if (alreadyPurchased) {
          errors.push({
            documentId: item.documentId,
            error: 'Already purchased',
          });
          continue;
        }

        // Verify document exists and price matches
        const document = await this.documentRepository.findOne({
          where: { id: item.documentId },
        });

        if (!document) {
          errors.push({
            documentId: item.documentId,
            error: 'Document not found',
          });
          continue;
        }

        if (document.license !== 'paid') {
          errors.push({
            documentId: item.documentId,
            error: 'Not available for purchase',
          });
          continue;
        }

        // Create transaction ID
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Ensure price is valid
        const purchaseAmount = document.price ?? 0;
        if (purchaseAmount <= 0) {
          errors.push({
            documentId: item.documentId,
            error: 'Invalid price',
          });
          continue;
        }

        // Create purchase record
        const purchase = this.purchaseRepository.create({
          userId,
          documentId: item.documentId,
          amount: purchaseAmount,
          currency: 'TND',
          paymentMethod: 'card',
          transactionId,
          status: 'completed',
        });

        const savedPurchase = await this.purchaseRepository.save(purchase);
        
        results.push({
          documentId: item.documentId,
          title: document.title || 'Untitled',
          amount: purchaseAmount,
          purchase: savedPurchase,
        });

        totalAmount += purchaseAmount;
      } catch (error) {
        errors.push({
          documentId: item.documentId,
          error: error.message,
        });
      }
    }

    return {
      success: results.length > 0,
      totalAmount,
      purchaseCount: results.length,
      purchases: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully purchased ${results.length} item(s)`,
    };
  }

  // Get user's purchase history
  async getUserPurchases(userId: string) {
    const purchases = await this.purchaseRepository.find({
      where: { userId },
      relations: ['document'],
      order: { createdAt: 'DESC' },
    });

    return purchases;
  }

  // Get purchases for a specific document (seller view)
  async getDocumentPurchases(documentId: string) {
    const purchases = await this.purchaseRepository.find({
      where: { documentId, status: 'completed' },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return purchases;
  }

  // Get seller analytics (revenue, sales count, etc.)
  async getSellerAnalytics(sellerId: string) {
    const query = this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoin('purchase.document', 'document')
      .where('document.userId = :sellerId', { sellerId })
      .andWhere('purchase.status = :status', { status: 'completed' });

    const purchases = await query.getMany();

    const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalSales = purchases.length;

    // Revenue by month (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    const revenueByMonth = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .select("TO_CHAR(purchase.created_at, 'Mon')", 'month')
      .addSelect('SUM(purchase.amount)', 'revenue')
      .addSelect('COUNT(*)', 'sales')
      .leftJoin('purchase.document', 'document')
      .where('document.userId = :sellerId', { sellerId })
      .andWhere('purchase.status = :status', { status: 'completed' })
      .andWhere('purchase.created_at >= :startDate', { startDate: sixMonthsAgo })
      .groupBy("TO_CHAR(purchase.created_at, 'Mon')")
      .orderBy('MIN(purchase.created_at)', 'ASC')
      .getRawMany();

    return {
      totalRevenue,
      totalSales,
      revenueByMonth,
    };
  }
}
