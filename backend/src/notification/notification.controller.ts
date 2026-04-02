import { Controller, Post, Body } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('notification')
export class NotificationController {
  constructor(
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) {}

  @Post('register')
  async simulateRegistration(
    @Body() body: { username: string; email: string },
  ) {
    await this.notificationQueue.add('send-welcome', {
      username: body.username,
      email: body.email,
    });

    return { message: 'Registration received. Notification job queued.' };
  }
}
