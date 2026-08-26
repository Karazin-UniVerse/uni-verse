import { BadRequestException, Injectable } from '@nestjs/common';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { getWsFunctionName } from '../../utils/wsfunctions';
import type { MoodleNotificationsResponse } from '../../types/Notification';
import { NotificationsResponseDto } from './moodle-notifications-dto';

@Injectable()
export class MoodleNotificationsService {
  constructor(private readonly moodleClient: MoodleClientService) {}

  async getNotifications(
    moodleToken: string,
    moodleId: string,
  ): Promise<NotificationsResponseDto> {
    if (!moodleToken || !moodleId) {
      throw new BadRequestException('Token or user ID are not provided');
    }

    const data = await this.moodleClient.client<MoodleNotificationsResponse>(
      getWsFunctionName('getNotifications'),
      moodleToken,
      moodleId,
    );

    const notifications = (data?.notifications || []).map((n) => ({
      id: n.id,
      subject: n.subject,
      fullmessage: n.fullmessage,
      timecreated: n.timecreated,
      read: n.read,
    }));

    return {
      notifications,
      unreadcount: data?.unreadcount || 0,
    };
  }
}
