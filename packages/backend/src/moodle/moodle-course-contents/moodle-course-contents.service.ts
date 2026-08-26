import { BadRequestException, Injectable } from '@nestjs/common';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { getWsFunctionName } from '../../utils/wsfunctions';
import { CourseContentDto } from './moodle-course-contents-dto';

@Injectable()
export class MoodleCourseContentsService {
  constructor(private readonly moodleClient: MoodleClientService) {}

  async getCourseContents(
    moodleToken: string,
    courseId: number,
  ): Promise<CourseContentDto[]> {
    if (!moodleToken) {
      throw new BadRequestException('Token is not provided');
    }

    return this.moodleClient.client<CourseContentDto[]>(
      getWsFunctionName('getCourseContents'),
      moodleToken,
      undefined,
      { courseid: courseId },
    );
  }
}
