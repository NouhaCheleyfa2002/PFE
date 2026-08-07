import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseEntity } from './entities/purchase.entity';
import { DocumentEntity } from '../documents/entities/document.entity';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(PurchaseEntity)
    private purchaseRepository: Repository<PurchaseEntity>,
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
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
