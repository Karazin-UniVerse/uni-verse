import {
  Controller,
  Get,
  Post,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { Notification } from '@universe/database';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  async getMyNotifications(
    @GetUser('sub') userId: string,
  ): Promise<Notification[]> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.notificationsService.getMyNotifications(userId);
  }

  @ApiBearerAuth()
  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<Notification> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.notificationsService.markAsRead(userId, id);
  }

  @ApiBearerAuth()
  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @GetUser('sub') userId: string,
  ): Promise<{ count: number }> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.notificationsService.markAllAsRead(userId);
  }
}
