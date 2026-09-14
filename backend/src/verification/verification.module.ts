import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { AIVerificationService } from './ai-verification.service';
import { VerificationRequestEntity } from './entities/verification-request.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationRequestEntity, UserEntity]),
    HttpModule,
    UserNotificationsModule,
    MailModule,
  ],
  controllers: [VerificationController],
  providers: [VerificationService, AIVerificationService],
  exports: [VerificationService, AIVerificationService],
})
export class VerificationModule {}
