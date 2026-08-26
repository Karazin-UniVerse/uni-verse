import { Controller, Get, Query } from '@nestjs/common';
import { MoodleCoursesService } from './moodle-courses/moodle-courses.service';
import { MoodleGradesService } from './moodle-grades/moodle-grades.service';
import { MoodleGradesResponseDto } from './moodle-grades/moodle-grades-dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { filterCourses, type CourseStatus } from '../utils/moodleFilters';

@ApiTags('moodle')
@Controller('moodle')
export class MoodleController {
  constructor(
    private readonly moodleCoursesService: MoodleCoursesService,
    private readonly moodleGradesService: MoodleGradesService,
  ) {}

  @Get('/courses')
  @ApiOperation({ summary: 'Get all courses of current user' })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    description: 'completed | not_completed | in_progress | not_started',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: 'string',
    description: 'Academic year, e.g. 2025/2026',
  })
  @ApiQuery({
    name: 'semester',
    required: false,
    type: 'string',
    description: 'Semester number, e.g. 1',
  })
  @ApiResponse({ status: 200, description: 'Get courses list' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  async getCourses(
    @GetUser('moodleId') moodleId: string,
    @GetUser('moodleToken') moodleToken: string,
    @Query('status') status?: CourseStatus,
    @Query('year') year?: string,
    @Query('semester') semester?: string,
  ) {
    const courses = await this.moodleCoursesService.getCourses(
      moodleToken,
      moodleId,
    );
    return filterCourses(courses, { status, year, semester });
  }

  @Get('/grades')
  @ApiOperation({
    summary: 'Get general grades across all enrolled courses for current user',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: MoodleGradesResponseDto,
    description: 'List of general grades across all enrolled courses',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  async getGrades(
    @GetUser('moodleId') moodleId: string,
    @GetUser('moodleToken') moodleToken: string,
  ): Promise<MoodleGradesResponseDto> {
    return await this.moodleGradesService.getGeneralGrades(
      moodleToken,
      moodleId,
    );
  }
}
