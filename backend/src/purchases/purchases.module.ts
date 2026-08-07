import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchaseEntity } from './entities/purchase.entity';
import { DocumentEntity } from '../documents/entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseEntity, DocumentEntity])],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
