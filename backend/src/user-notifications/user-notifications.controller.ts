import { Controller, Get, Patch, Param, UseGuards, Request, Post, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserNotificationsService } from './user-notifications.service';
import { CreateNotificationDto } from './dto/user-notification.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Controller('user-notifications')
@UseGuards(JwtAuthGuard)
export class UserNotificationsController {
  constructor(
    private readonly notificationsService: UserNotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  async getNotifications(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    return this.notificationsService.findByUserId(userId);
  }

  @Get('unread')
  async getUnreadNotifications(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    return this.notificationsService.findUnreadByUserId(userId);
  }

  @Get('unread/count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    await this.notificationsService.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }

  @Post()
  async createNotification(@Body() createDto: CreateNotificationDto) {
    return this.notificationsService.create(createDto);
  }

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async broadcastAnnouncement(
    @Body() body: { message: string; type?: string },
  ) {
    // Send real-time notification via WebSocket
    this.notificationsGateway.broadcast({
      message: body.message,
      type: body.type || 'announcement',
      timestamp: new Date(),
    });

    return {
      success: true,
      message: 'Announcement broadcasted successfully',
    };
  }

  @Post(':id')
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    await this.notificationsService.deleteNotification(id, userId);
    return { message: 'Notification deleted successfully' };
  }
}
