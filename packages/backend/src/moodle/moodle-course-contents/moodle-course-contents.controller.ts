import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AtGuard } from '../../auth/guards/at.guard';
import { MoodleCourseContentsService } from './moodle-course-contents.service';
import { CourseContentDto } from './moodle-course-contents-dto';

@ApiTags('moodle')
@Controller('moodle/courses')
@UseGuards(AtGuard)
@ApiBearerAuth()
export class MoodleCourseContentsController {
  constructor(private readonly contentsService: MoodleCourseContentsService) {}

  @Get(':courseId/contents')
  @ApiOperation({ summary: 'Get course contents' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiResponse({ status: 200, type: [CourseContentDto] })
  async getCourseContents(
    @GetUser('moodleToken') moodleToken: string,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<CourseContentDto[]> {
    return this.contentsService.getCourseContents(moodleToken, courseId);
  }
}
