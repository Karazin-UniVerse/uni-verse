import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { getWsFunctionName } from '../../utils/wsfunctions';
import type { MoodleNotificationsResponse } from '../../types/Notification';
import { NotificationsResponseDto } from './moodle-notifications-dto';

@Injectable()
export class MoodleNotificationsService {
  private readonly logger = new Logger(MoodleNotificationsService.name);

  constructor(private readonly moodleClient: MoodleClientService) {}

  async getNotifications(
    moodleToken: string,
    moodleId: string,
  ): Promise<NotificationsResponseDto> {
    if (!moodleToken || !moodleId) {
      throw new BadRequestException('Token or user ID are not provided');
    }

    try {
      const data = await this.moodleClient.client<MoodleNotificationsResponse>(
        getWsFunctionName('getNotifications'),
        moodleToken,
        undefined,
        { useridto: moodleId },
      );

      const notifications = (data?.notifications || []).map((notification) => ({
        id: notification.id,
        subject: notification.subject,
        fullmessage: notification.fullmessage,
        timecreated: notification.timecreated,
        read: notification.read,
      }));

      return {
        notifications,
        unreadcount: data?.unreadcount || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch notifications: ${error}`);

      return {
        notifications: [],
        unreadcount: 0,
      };
    }
  }
}
