import { BadRequestException, Injectable } from '@nestjs/common';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { getWsFunctionName } from '../../utils/wsfunctions';

@Injectable()
export class MoodleCourseContentsService {
  constructor(private readonly moodleClient: MoodleClientService) {}

  async getCourseContents(
    moodleToken: string,
    courseId: number,
  ): Promise<unknown[]> {
    if (!moodleToken) {
      throw new BadRequestException('Token is not provided');
    }

    return this.moodleClient.client<unknown[]>(
      getWsFunctionName('getCourseContents'),
      moodleToken,
      undefined,
      { courseid: courseId },
    );
  }
}
