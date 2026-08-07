import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { VerificationRequestEntity } from './entities/verification-request.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationRequestEntity, UserEntity]),
    UserNotificationsModule,
  ],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
