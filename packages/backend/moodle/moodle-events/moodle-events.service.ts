import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { getWsFunctionName } from '../../utils/wsfunctions';
import type { MoodleUpcomingEventsResponse } from '../../types/CalendarEvent';
import { CalendarEventDto } from './moodle-events-dto';

@Injectable()
export class MoodleEventsService {
  private readonly logger = new Logger(MoodleEventsService.name);

  constructor(private readonly moodleClient: MoodleClientService) {}

  async getUpcomingEvents(
    moodleToken: string,
    moodleId: string,
  ): Promise<CalendarEventDto[]> {
    if (!moodleToken || !moodleId) {
      throw new BadRequestException('Token or user ID are not provided');
    }

    try {
      const data = await this.moodleClient.client<MoodleUpcomingEventsResponse>(
        getWsFunctionName('getUpcomingEvents'),
        moodleToken,
      );

      return (data?.events || []).map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        timestart: event.timestart,
        timeduration: event.timeduration,
        eventtype: event.eventtype,
        courseName: event.course ? event.course.fullname : undefined,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch upcoming events: ${error}`);

      return [];
    }
  }
}
