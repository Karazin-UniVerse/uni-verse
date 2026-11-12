import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  Injectable,
  Param,
  ParseUUIDPipe,
  Patch,
  type PipeTransform,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Role,
  type CalendarSubscriptionToken,
  type CurriculumPlan,
  type SemesterCalendar,
  type TeacherUnavailability as TeacherUnavailabilityRecord,
  type TeachingAssignment,
  type TimetableEvent,
} from '@universe/database';
import { AtGuard } from '../auth/guards/at.guard';
import { Public } from '../auth/decorators/public.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import {
  TimetableService,
  type AcademicGroupWithSubgroups,
  type CurriculumPlanWithAssignments,
  type GenerateTimetableDraftResult,
  type SafeTeacher,
  type TeachingAssignmentWithDetails,
  type TimetableVersionWithEvents,
} from './timetable.service';
import type {
  AdjustDraftSlotResponse,
  IcsCalendarEvent,
  SemesterCalendarResponse,
  TeacherSlotPreference,
} from '@universe/core/types/timetable';
import {
  AdjustDraftSlotDto,
  RescheduleEventDto,
  ConfirmTeacherUnavailabilityDto,
  CreateAcademicGroupDto,
  CreateCurriculumPlanDto,
  CreateSemesterCalendarDto,
  CreateTeacherUnavailabilityDto,
  CreateTeachingAssignmentDto,
  GenerateTimetableDto,
  GetSemesterCalendarQueryDto,
  ListTeachingAssignmentsQueryDto,
  SaveSlotPreferencesDto,
  UpdateMeetingUrlDto,
  UpdateTeachingAssignmentDto,
} from './dto';

function assertAdmin(roles?: string[]): void {
  if (!roles?.includes(Role.ADMIN) && !roles?.includes('ADMIN')) {
    throw new ForbiddenException('Administrative privileges required');
  }
}

const FEED_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

@Injectable()
export class ParseFeedTokenPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !FEED_TOKEN_PATTERN.test(value)) {
      throw new BadRequestException('Invalid calendar subscription token');
    }

    return value;
  }
}

@ApiTags('Timetable')
@Controller('timetable')
@UseGuards(AtGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List semesters for instructor preferences' })
  @Get('my/slot-preferences/semesters')
  listPreferenceSemesters(
    @GetUser('sub') userId: string,
  ): Promise<SemesterCalendarResponse[]> {
    return this.timetableService.listPreferenceSemesters(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read own semester slot preferences' })
  @Get('my/slot-preferences/:semesterCalendarId')
  getMySlotPreferences(
    @GetUser('sub') userId: string,
    @Param('semesterCalendarId', ParseUUIDPipe) semesterCalendarId: string,
  ): Promise<TeacherSlotPreference[]> {
    return this.timetableService.getMySlotPreferences(
      userId,
      semesterCalendarId,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace own semester slot preferences' })
  @Put('my/slot-preferences/:semesterCalendarId')
  saveMySlotPreferences(
    @GetUser('sub') userId: string,
    @Param('semesterCalendarId', ParseUUIDPipe) semesterCalendarId: string,
    @Body() dto: SaveSlotPreferencesDto,
  ): Promise<TeacherSlotPreference[]> {
    return this.timetableService.saveMySlotPreferences(
      userId,
      semesterCalendarId,
      dto,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an academic group' })
  @Post('groups')
  async createAcademicGroup(
    @Body() dto: CreateAcademicGroupDto,
    @GetUser('roles') roles?: string[],
  ): Promise<AcademicGroupWithSubgroups> {
    assertAdmin(roles);

    return this.timetableService.createAcademicGroup(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all academic groups' })
  @Get('groups')
  async listAcademicGroups(): Promise<AcademicGroupWithSubgroups[]> {
    return this.timetableService.listAcademicGroups();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a curriculum plan' })
  @Post('curriculum-plans')
  async createCurriculumPlan(
    @Body() dto: CreateCurriculumPlanDto,
    @GetUser('roles') roles?: string[],
  ): Promise<CurriculumPlan> {
    assertAdmin(roles);

    return this.timetableService.createCurriculumPlan(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active curriculum plans' })
  @Get('curriculum-plans')
  async listCurriculumPlans(
    @GetUser('roles') roles?: string[],
  ): Promise<CurriculumPlan[]> {
    assertAdmin(roles);

    return this.timetableService.listCurriculumPlans();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List teachers available for assignments' })
  @Get('teachers')
  async listTeachers(
    @GetUser('roles') roles?: string[],
  ): Promise<SafeTeacher[]> {
    assertAdmin(roles);

    return this.timetableService.listTeachers();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a curriculum plan by ID' })
  @Get('curriculum-plans/:id')
  async getCurriculumPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('roles') roles?: string[],
  ): Promise<CurriculumPlanWithAssignments> {
    assertAdmin(roles);

    return this.timetableService.getCurriculumPlan(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a teaching assignment' })
  @Post('assignments')
  async createTeachingAssignment(
    @Body() dto: CreateTeachingAssignmentDto,
    @GetUser('roles') roles?: string[],
  ): Promise<TeachingAssignmentWithDetails> {
    assertAdmin(roles);

    return this.timetableService.createTeachingAssignment(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a teaching assignment' })
  @Put('assignments/:id')
  async updateTeachingAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeachingAssignmentDto,
    @GetUser('roles') roles?: string[],
  ): Promise<TeachingAssignmentWithDetails> {
    assertAdmin(roles);

    return this.timetableService.updateTeachingAssignment(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Archive a teaching assignment without removing scheduled events',
  })
  @Delete('assignments/:id')
  async deleteTeachingAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('roles') roles?: string[],
  ): Promise<{ count: number }> {
    assertAdmin(roles);

    return this.timetableService.deleteTeachingAssignment(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List teaching assignments for a curriculum plan' })
  @Get('assignments')
  async listTeachingAssignments(
    @Query() query: ListTeachingAssignmentsQueryDto,
    @GetUser('roles') roles?: string[],
  ): Promise<TeachingAssignmentWithDetails[]> {
    assertAdmin(roles);

    return this.timetableService.listTeachingAssignments(
      query.curriculumPlanId,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List teaching assignments for the current teacher',
  })
  @Get('my/assignments')
  async listMyTeachingAssignments(
    @GetUser('sub') userId: string,
  ): Promise<TeachingAssignmentWithDetails[]> {
    return this.timetableService.listTeacherAssignments(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update meeting URL for a teaching assignment' })
  @Put('assignments/:id/meeting-url')
  async updateMeetingUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeetingUrlDto,
    @GetUser('sub') userId: string,
    @GetUser('roles') roles?: string[],
  ): Promise<TeachingAssignment> {
    return this.timetableService.updateMeetingUrl(id, dto.meetingUrl, {
      userId,
      roles,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure or upsert a semester calendar' })
  @Post(['calendar', 'semester-calendar'])
  async configureSemesterCalendar(
    @Body() dto: CreateSemesterCalendarDto,
    @GetUser('roles') roles?: string[],
  ): Promise<SemesterCalendar> {
    assertAdmin(roles);

    return this.timetableService.configureSemesterCalendar(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a semester calendar' })
  @Get(['calendar', 'semester-calendar'])
  async getSemesterCalendar(
    @Query() query: GetSemesterCalendarQueryDto,
    @GetUser('roles') roles?: string[],
  ): Promise<SemesterCalendar> {
    assertAdmin(roles);

    return this.timetableService.getSemesterCalendar(
      query.academicYear,
      query.semester,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request teacher unavailability' })
  @Post('teachers/:teacherId/unavailability')
  async requestTeacherUnavailability(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Body() dto: CreateTeacherUnavailabilityDto,
    @GetUser('sub') userId: string,
    @GetUser('roles') roles?: string[],
  ): Promise<TeacherUnavailabilityRecord> {
    const isAdmin = roles?.includes(Role.ADMIN) || roles?.includes('ADMIN');

    if (teacherId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'You cannot submit unavailability for another teacher',
      );
    }

    return this.timetableService.requestTeacherUnavailability(teacherId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm teacher unavailability' })
  @Put('unavailability/:id/confirm')
  async confirmTeacherUnavailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmTeacherUnavailabilityDto,
    @GetUser('roles') roles?: string[],
  ): Promise<TeacherUnavailabilityRecord> {
    assertAdmin(roles);

    return this.timetableService.confirmTeacherUnavailability(
      id,
      dto.isConfirmed,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate timetable draft candidates' })
  @Post('plans/:id/generate')
  async generateTimetableDraft(
    @Param('id', ParseUUIDPipe) planId: string,
    @Body() dto: GenerateTimetableDto,
    @GetUser('sub') userId: string,
    @GetUser('roles') roles?: string[],
  ): Promise<GenerateTimetableDraftResult> {
    assertAdmin(roles);

    return this.timetableService.generateTimetableDraft(planId, {
      ...dto,
      userId,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adjust a recurring draft timetable slot' })
  @Patch('versions/:versionId/slots')
  async adjustDraftSlot(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: AdjustDraftSlotDto,
    @GetUser('roles') roles?: string[],
  ): Promise<AdjustDraftSlotResponse> {
    assertAdmin(roles);

    return this.timetableService.adjustDraftSlot(versionId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reschedule a published timetable event' })
  @Patch('events/:id/reschedule')
  async rescheduleEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleEventDto,
    @GetUser('roles') roles?: string[],
  ): Promise<TimetableEvent> {
    assertAdmin(roles);

    return this.timetableService.rescheduleEvent(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a timetable version' })
  @Post('versions/:id/publish')
  async publishTimetableVersion(
    @Param('id', ParseUUIDPipe) versionId: string,
    @GetUser('sub') userId: string,
    @GetUser('roles') roles?: string[],
  ): Promise<TimetableVersionWithEvents> {
    assertAdmin(roles);

    return this.timetableService.publishTimetableVersion(versionId, userId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user schedule events for published timetable',
  })
  @Get('my/events')
  async getMyScheduleEvents(
    @GetUser('sub') userId: string,
  ): Promise<IcsCalendarEvent[]> {
    return this.timetableService.getMyScheduleEvents(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get or create a personal calendar subscription token',
  })
  @Post('calendar/tokens')
  async createSubscriptionToken(
    @GetUser('sub') userId: string,
  ): Promise<CalendarSubscriptionToken> {
    return this.timetableService.createSubscriptionToken(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Rotate personal calendar subscription token',
  })
  @Post('calendar/tokens/rotate')
  async rotateSubscriptionToken(
    @GetUser('sub') userId: string,
  ): Promise<CalendarSubscriptionToken> {
    return this.timetableService.rotateSubscriptionToken(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke all active personal calendar subscription tokens',
  })
  @Delete('calendar/tokens')
  async revokeSubscriptionTokens(
    @GetUser('sub') userId: string,
  ): Promise<{ count: number }> {
    return this.timetableService.revokeSubscriptionTokens(userId);
  }

  @Public()
  @ApiOperation({ summary: 'Get calendar feed in ICS format' })
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Get('calendar/feed/:token')
  async getCalendarFeed(
    @Param('token', ParseFeedTokenPipe) token: string,
  ): Promise<string> {
    return this.timetableService.getIcsFeed(token);
  }
}
