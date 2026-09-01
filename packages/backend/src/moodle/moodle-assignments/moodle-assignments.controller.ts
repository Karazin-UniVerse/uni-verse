import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
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
import { MoodleAssignmentsService } from './moodle-assignments.service';
import {
  AssignmentItemDto,
  SaveSubmissionDto,
  SubmissionStatusDto,
  GetAssignmentsQueryDto,
} from './moodle-assignments-dto';

@ApiTags('moodle')
@Controller('moodle')
@UseGuards(AtGuard)
@ApiBearerAuth()
export class MoodleAssignmentsController {
  constructor(private readonly assignmentsService: MoodleAssignmentsService) {}

  @Get('assignments')
  @ApiOperation({ summary: 'Get user assignments' })
  @ApiResponse({ status: 200, type: [AssignmentItemDto] })
  async getAssignments(
    @GetUser('moodleToken') moodleToken: string,
    @GetUser('moodleId') moodleId: string,
    @Query() query: GetAssignmentsQueryDto,
  ): Promise<AssignmentItemDto[]> {
    const assignments = await this.assignmentsService.getAssignments(
      moodleToken,
      moodleId,
    );
    return this.filterAndSortAssignments(assignments, query);
  }

  @Get('assignments/:assignId/status')
  @ApiOperation({ summary: 'Get assignment submission status' })
  @ApiParam({ name: 'assignId', type: 'number' })
  @ApiResponse({ status: 200, type: SubmissionStatusDto })
  async getSubmissionStatus(
    @GetUser('moodleToken') moodleToken: string,
    @GetUser('moodleId') moodleId: string,
    @Param('assignId', ParseIntPipe) assignId: number,
  ): Promise<SubmissionStatusDto> {
    return this.assignmentsService.getSubmissionStatus(
      moodleToken,
      moodleId,
      assignId,
    );
  }

  @Post('assignments/:assignId/submission')
  @ApiOperation({ summary: 'Save assignment submission' })
  @ApiParam({ name: 'assignId', type: 'number' })
  @ApiResponse({ status: 201 })
  async saveSubmission(
    @GetUser('moodleToken') moodleToken: string,
    @Param('assignId', ParseIntPipe) assignId: number,
    @Body() dto: SaveSubmissionDto,
  ): Promise<unknown> {
    return this.assignmentsService.saveSubmission(
      moodleToken,
      assignId,
      dto.text,
      dto.fileItemId,
    );
  }

  private filterAndSortAssignments(
    assignments: AssignmentItemDto[],
    query: GetAssignmentsQueryDto,
  ) {
    let result = assignments;

    if (query.year) {
      result = result.filter((assignment) => assignment.year === query.year);
    }
    if (query.semester) {
      result = result.filter(
        (assignment) => String(assignment.semester) === query.semester,
      );
    }
    if (query.status === 'completed') {
      const now = Date.now() / 1000;
      result = result.filter((assignment) => assignment.duedate < now);
    } else if (query.status === 'not_completed') {
      const now = Date.now() / 1000;
      result = result.filter((assignment) => assignment.duedate >= now);
    }
    if (query.dateFrom) {
      result = result.filter(
        (assignment) => assignment.duedate >= query.dateFrom!,
      );
    }
    if (query.dateTo) {
      result = result.filter(
        (assignment) => assignment.duedate <= query.dateTo!,
      );
    }
    if (query.sortByDate) {
      result.sort((a, b) =>
        query.sortByDate === 'asc'
          ? a.duedate - b.duedate
          : b.duedate - a.duedate,
      );
    }

    return result;
  }
}
