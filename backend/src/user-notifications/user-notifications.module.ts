import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserNotificationEntity } from './entities/user-notification.entity';
import { UserNotificationsService } from './user-notifications.service';
import { UserNotificationsController } from './user-notifications.controller';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserNotificationEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [UserNotificationsController],
  providers: [UserNotificationsService, NotificationsGateway],
  exports: [UserNotificationsService, NotificationsGateway],
})
export class UserNotificationsModule {}
