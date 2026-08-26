import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AtGuard } from '../../auth/guards/at.guard';
import { MoodleNotificationsService } from './moodle-notifications.service';
import { NotificationsResponseDto } from './moodle-notifications-dto';

@ApiTags('moodle')
@Controller('moodle')
@UseGuards(AtGuard)
@ApiBearerAuth()
export class MoodleNotificationsController {
  constructor(
    private readonly notificationsService: MoodleNotificationsService,
  ) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, type: NotificationsResponseDto })
  async getNotifications(
    @GetUser('moodleToken') moodleToken: string,
    @GetUser('moodleId') moodleId: string,
  ): Promise<NotificationsResponseDto> {
    return this.notificationsService.getNotifications(moodleToken, moodleId);
  }
}
