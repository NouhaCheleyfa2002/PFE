import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  async createPurchase(
    @Request() req,
    @Body() body: { documentId: string; paymentMethod?: string },
  ) {
    return this.purchasesService.createPurchase(
      req.user.sub,
      body.documentId,
      body.paymentMethod || 'card',
    );
  }

  @Get('check/:documentId')
  async checkPurchase(@Request() req, @Param('documentId') documentId: string) {
    const hasPurchased = await this.purchasesService.hasPurchased(req.user.sub, documentId);
    return { hasPurchased };
  }

  @Get('my-purchases')
  async getMyPurchases(@Request() req) {
    const purchases = await this.purchasesService.getUserPurchases(req.user.sub);
    return { purchases };
  }

  @Get('seller-analytics')
  async getSellerAnalytics(@Request() req) {
    return this.purchasesService.getSellerAnalytics(req.user.sub);
  }

  @Get('document/:documentId')
  async getDocumentPurchases(@Param('documentId') documentId: string) {
    const purchases = await this.purchasesService.getDocumentPurchases(documentId);
    return { purchases };
  }
}
