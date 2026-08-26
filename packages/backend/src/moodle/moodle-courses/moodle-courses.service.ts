import { BadRequestException, Injectable } from '@nestjs/common';
import { getWsFunctionName } from '../../utils/wsfunctions';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { normalizeMoodleText } from '../../utils/moodleFilters';
import type { Course } from '../../types/Course';

@Injectable()
export class MoodleCoursesService {
  constructor(private readonly moodleClient: MoodleClientService) {}

  async getCourses(token: string, moodleId: string) {
    if (!token || !moodleId) {
      throw new BadRequestException('token or user id are not provided');
    }
    const data: Course[] = await this.moodleClient.client(
      getWsFunctionName('getCourses'),
      token,
      moodleId,
    );
    return data.map((c: Course) => ({
      id: c.id,
      fullname: c.fullname,
      shortname: c.shortname,
      summary: normalizeMoodleText(c.summary),
      progress: c.progress,
    }));
  }
}
