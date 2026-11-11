import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
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
} from '@universe/database';
import { AtGuard } from '../auth/guards/at.guard';
import { Public } from '../auth/decorators/public.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import {
  TimetableService,
  type AcademicGroupWithSubgroups,
  type CurriculumPlanWithAssignments,
  type GenerateTimetableDraftResult,
  type TeachingAssignmentWithDetails,
  type TimetableVersionWithEvents,
} from './timetable.service';
import {
  ConfirmTeacherUnavailabilityDto,
  CreateAcademicGroupDto,
  CreateCurriculumPlanDto,
  CreateSemesterCalendarDto,
  CreateTeacherUnavailabilityDto,
  CreateTeachingAssignmentDto,
  GenerateTimetableDto,
  GetSemesterCalendarQueryDto,
  ListTeachingAssignmentsQueryDto,
  UpdateMeetingUrlDto,
} from './dto';

function assertAdmin(roles?: string[]): void {
  if (!roles?.includes(Role.ADMIN) && !roles?.includes('ADMIN')) {
    throw new ForbiddenException('Administrative privileges required');
  }
}

@ApiTags('Timetable')
@Controller('timetable')
@UseGuards(AtGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

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
  @ApiOperation({ summary: 'Get a curriculum plan by ID' })
  @Get('curriculum-plans/:id')
  async getCurriculumPlan(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CurriculumPlanWithAssignments> {
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
  @ApiOperation({ summary: 'List teaching assignments for a curriculum plan' })
  @Get('assignments')
  async listTeachingAssignments(
    @Query() query: ListTeachingAssignmentsQueryDto,
  ): Promise<TeachingAssignmentWithDetails[]> {
    return this.timetableService.listTeachingAssignments(
      query.curriculumPlanId,
    );
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
  @Post('calendar')
  async configureSemesterCalendar(
    @Body() dto: CreateSemesterCalendarDto,
    @GetUser('roles') roles?: string[],
  ): Promise<SemesterCalendar> {
    assertAdmin(roles);

    return this.timetableService.configureSemesterCalendar(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a semester calendar' })
  @Get('calendar')
  async getSemesterCalendar(
    @Query() query: GetSemesterCalendarQueryDto,
  ): Promise<SemesterCalendar> {
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
  @ApiOperation({ summary: 'Create a personal calendar subscription token' })
  @Post('calendar/tokens')
  async createSubscriptionToken(
    @GetUser('sub') userId: string,
  ): Promise<CalendarSubscriptionToken> {
    return this.timetableService.createSubscriptionToken(userId);
  }

  @Public()
  @ApiOperation({ summary: 'Get calendar feed in ICS format' })
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Get('calendar/feed/:token')
  async getCalendarFeed(
    @Param('token', ParseUUIDPipe) token: string,
  ): Promise<string> {
    return this.timetableService.getIcsFeed(token);
  }
}
