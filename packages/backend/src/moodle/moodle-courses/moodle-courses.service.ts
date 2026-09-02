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
    try {
      const data = await this.moodleClient.client<Course[]>(
        getWsFunctionName('getCourses'),
        token,
        moodleId,
      );
      if (!Array.isArray(data)) {
        return [];
      }
      return data.map((course: Course) => ({
        id: course.id,
        fullname: course.fullname,
        shortname: course.shortname,
        summary: normalizeMoodleText(course.summary),
        progress: course.progress,
      }));
    } catch {
      return [];
    }
  }
}
