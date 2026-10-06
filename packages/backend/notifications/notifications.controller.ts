import {
  Controller,
  Get,
  Post,
  Param,
  ForbiddenException,
} from '@nestjs/common';
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
  getMyNotifications(@GetUser('sub') userId: string): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.notificationsService.getMyNotifications(userId);
  }

  @ApiBearerAuth()
  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.notificationsService.markAsRead(userId, id);
  }

  @ApiBearerAuth()
  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@GetUser('sub') userId: string): Promise<unknown> {
    if (!userId) throw new ForbiddenException('User not authenticated');

    return this.notificationsService.markAllAsRead(userId);
  }
}
