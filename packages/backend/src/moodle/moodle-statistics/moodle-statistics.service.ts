import { Injectable } from '@nestjs/common';
import { MoodleCoursesService } from '../moodle-courses/moodle-courses.service';
import { StatisticsDto } from './moodle-statistics-dto';

@Injectable()
export class MoodleStatisticsService {
  constructor(private readonly moodleCoursesService: MoodleCoursesService) {}

  async getStatistics(
    moodleToken: string,
    moodleId: string,
  ): Promise<StatisticsDto> {
    const courses = await this.moodleCoursesService.getCourses(
      moodleToken,
      moodleId,
    );
    return { total: courses.length };
  }
}
