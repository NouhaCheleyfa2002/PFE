import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../auth/entities/user.entity';
import { ResourceRating } from '../ratings/entities/rating.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { PurchaseEntity } from '../purchases/entities/purchase.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notification-queue' }),
    TypeOrmModule.forFeature([UserEntity, ResourceRating, DocumentEntity, PurchaseEntity]),
    AuthModule,
    AiModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
