import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { PaymentEntity } from './entities/payment.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { PurchaseEntity } from '../purchases/entities/purchase.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      PaymentEntity,
      DocumentEntity,
      UserEntity,
      PurchaseEntity,
    ]),
    MailModule, // For sending purchase/sale notifications
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
