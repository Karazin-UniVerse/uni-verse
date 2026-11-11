import crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Role,
  type AcademicGroup,
  type AcademicStream,
  type AcademicSubgroup,
  type CalendarSubscriptionToken,
  type CurriculumPlan,
  type Prisma,
  type SemesterCalendar,
  type TeacherUnavailability as TeacherUnavailabilityRecord,
  type TeachingAssignment,
  type TeachingType,
  type TimetableEvent,
  type TimetableVersion,
} from '@universe/database';
import type {
  GenerateTimetableDiagnostics,
  IcsCalendarEvent,
  ScheduledEvent,
  SemesterCalendarConfig,
  TeacherUnavailability,
  TeachingDemand,
  TimetableCandidate,
} from '@universe/core/types/timetable';
import {
  checkTimetableConflicts,
  generateIcsCalendar,
  generateTimetableCandidates,
} from '@universe/core/utils/timetable';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateAcademicGroupDto,
  CreateCurriculumPlanDto,
  CreateSemesterCalendarDto,
  CreateTeacherUnavailabilityDto,
  CreateTeachingAssignmentDto,
  GenerateTimetableDto,
} from './dto';

export const TEACHER_SAFE_SELECT = {
  id: true,
  name: true,
  roles: true,
} as const;

export type SafeTeacher = {
  id: string;
  name: string | null;
  roles: Role[];
};

export type AcademicGroupWithSubgroups = AcademicGroup & {
  subgroups: AcademicSubgroup[];
};

export type TeachingAssignmentWithDetails = TeachingAssignment & {
  teacher: SafeTeacher;
  group: AcademicGroup | null;
  subgroup: AcademicSubgroup | null;
  stream: AcademicStream | null;
};

export type CurriculumPlanWithAssignments = CurriculumPlan & {
  teachingAssignments: TeachingAssignmentWithDetails[];
};

export type GenerateTimetableDraftResult = {
  versionId: string;
  candidates: TimetableCandidate[];
  diagnostics: GenerateTimetableDiagnostics;
};

export type TimetableVersionWithEvents = TimetableVersion & {
  events: TimetableEvent[];
};

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async createAcademicGroup(
    dto: CreateAcademicGroupDto,
  ): Promise<AcademicGroupWithSubgroups> {
    return this.prisma.academicGroup.create({
      data: {
        code: dto.code,
        degreeLevel: dto.degreeLevel,
        studyForm: dto.studyForm,
        entryYear: dto.entryYear,
        academicYear: dto.academicYear,
        subgroups:
          dto.subgroups && dto.subgroups.length > 0
            ? {
                create: dto.subgroups.map((name) => ({ name })),
              }
            : undefined,
      },
      include: {
        subgroups: true,
      },
    });
  }

  async listAcademicGroups(): Promise<AcademicGroupWithSubgroups[]> {
    return this.prisma.academicGroup.findMany({
      include: {
        subgroups: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  async createCurriculumPlan(
    dto: CreateCurriculumPlanDto,
  ): Promise<CurriculumPlan> {
    return this.prisma.curriculumPlan.create({
      data: {
        faculty: dto.faculty,
        title: dto.title,
        academicYear: dto.academicYear,
        semester: dto.semester,
        isDraft: dto.isDraft ?? true,
      },
    });
  }

  async getCurriculumPlan(id: string): Promise<CurriculumPlanWithAssignments> {
    const plan = await this.prisma.curriculumPlan.findUnique({
      where: { id },
      include: {
        teachingAssignments: {
          include: {
            teacher: {
              select: TEACHER_SAFE_SELECT,
            },
            group: true,
            subgroup: true,
            stream: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Curriculum plan with ID '${id}' not found`);
    }

    return plan as unknown as CurriculumPlanWithAssignments;
  }

  async createTeachingAssignment(
    dto: CreateTeachingAssignmentDto,
  ): Promise<TeachingAssignmentWithDetails> {
    const created = await this.prisma.teachingAssignment.create({
      data: {
        curriculumPlanId: dto.curriculumPlanId,
        disciplineTitle: dto.disciplineTitle,
        teachingType: dto.teachingType,
        academicHours: dto.academicHours,
        teacherId: dto.teacherId,
        groupId: dto.groupId,
        subgroupId: dto.subgroupId,
        streamId: dto.streamId,
        isSaturdayOnly: dto.isSaturdayOnly ?? false,
        hasLateSlotAuthorization: dto.hasLateSlotAuthorization ?? false,
        meetingUrl: dto.meetingUrl,
      },
      include: {
        teacher: {
          select: TEACHER_SAFE_SELECT,
        },
        group: true,
        subgroup: true,
        stream: true,
      },
    });

    return created as unknown as TeachingAssignmentWithDetails;
  }

  async listTeachingAssignments(
    planId: string,
  ): Promise<TeachingAssignmentWithDetails[]> {
    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { curriculumPlanId: planId },
      include: {
        teacher: {
          select: TEACHER_SAFE_SELECT,
        },
        group: true,
        subgroup: true,
        stream: true,
      },
      orderBy: { disciplineTitle: 'asc' },
    });

    return assignments as unknown as TeachingAssignmentWithDetails[];
  }

  async configureSemesterCalendar(
    dto: CreateSemesterCalendarDto,
  ): Promise<SemesterCalendar> {
    return this.prisma.semesterCalendar.upsert({
      where: {
        academicYear_semester: {
          academicYear: dto.academicYear,
          semester: dto.semester,
        },
      },
      create: {
        academicYear: dto.academicYear,
        semester: dto.semester,
        startDate: new Date(dto.startDate),
        teachingWeeks: dto.teachingWeeks,
        excludedDates: dto.excludedDates ?? [],
        makeupSaturdays: (dto.makeupSaturdays ?? []) as unknown as object[],
      },
      update: {
        startDate: new Date(dto.startDate),
        teachingWeeks: dto.teachingWeeks,
        excludedDates: dto.excludedDates ?? [],
        makeupSaturdays: (dto.makeupSaturdays ?? []) as unknown as object[],
      },
    });
  }

  async getSemesterCalendar(
    academicYear: string,
    semester: number,
  ): Promise<SemesterCalendar> {
    const calendar = await this.prisma.semesterCalendar.findUnique({
      where: {
        academicYear_semester: {
          academicYear,
          semester,
        },
      },
    });

    if (!calendar) {
      throw new NotFoundException(
        `Semester calendar not found for academic year '${academicYear}' and semester ${semester}`,
      );
    }

    return calendar;
  }

  async requestTeacherUnavailability(
    teacherId: string,
    dto: CreateTeacherUnavailabilityDto,
  ): Promise<TeacherUnavailabilityRecord> {
    const dateObj = new Date(dto.date);

    return this.prisma.teacherUnavailability.upsert({
      where: {
        teacherId_date_pair: {
          teacherId,
          date: dateObj,
          pair: dto.pair,
        },
      },
      create: {
        teacherId,
        date: dateObj,
        pair: dto.pair,
        reason: dto.reason,
        isConfirmed: false,
      },
      update: {
        reason: dto.reason,
        isConfirmed: false,
      },
    });
  }

  async confirmTeacherUnavailability(
    id: string,
    isConfirmed: boolean,
  ): Promise<TeacherUnavailabilityRecord> {
    const existing = await this.prisma.teacherUnavailability.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Teacher unavailability with ID '${id}' not found`,
      );
    }

    return this.prisma.teacherUnavailability.update({
      where: { id },
      data: { isConfirmed },
    });
  }

  async generateTimetableDraft(
    planId: string,
    options?: GenerateTimetableDto & { userId?: string; createdById?: string },
  ): Promise<GenerateTimetableDraftResult> {
    const plan = await this.getCurriculumPlan(planId);
    const calendar = await this.getSemesterCalendar(
      plan.academicYear,
      plan.semester,
    );

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { curriculumPlanId: planId },
      include: {
        teacher: {
          select: TEACHER_SAFE_SELECT,
        },
        group: true,
        subgroup: true,
        stream: {
          include: {
            groups: true,
          },
        },
      },
    });

    const unavailabilities = await this.prisma.teacherUnavailability.findMany({
      where: { isConfirmed: true },
    });

    const unavailabilityList: TeacherUnavailability[] = unavailabilities.map(
      (u) => ({
        teacherId: u.teacherId,
        date:
          u.date instanceof Date
            ? u.date.toISOString().slice(0, 10)
            : String(u.date).slice(0, 10),
        pair: u.pair,
        isConfirmed: u.isConfirmed,
      }),
    );

    const demands: TeachingDemand[] = assignments.map((a) => {
      const groupIds: string[] = [];

      if (a.groupId) {
        groupIds.push(a.groupId);
      }

      if (a.stream?.groups) {
        for (const g of a.stream.groups) {
          if (!groupIds.includes(g.id)) {
            groupIds.push(g.id);
          }
        }
      }

      return {
        id: a.id,
        disciplineTitle: a.disciplineTitle,
        teachingType:
          a.teachingType as unknown as TeachingDemand['teachingType'],
        teacherId: a.teacherId,
        groupIds,
        academicHours: a.academicHours,
        subgroupId: a.subgroupId ?? undefined,
        streamId: a.streamId ?? undefined,
        isSaturdayOnly: a.isSaturdayOnly,
        hasLateSlotAuthorization: a.hasLateSlotAuthorization,
      };
    });

    const startDateStr =
      calendar.startDate instanceof Date
        ? calendar.startDate.toISOString().slice(0, 10)
        : String(calendar.startDate).slice(0, 10);

    const calendarConfig: SemesterCalendarConfig = {
      startDate: startDateStr,
      teachingWeeks: calendar.teachingWeeks,
      excludedDates: calendar.excludedDates,
      makeupSaturdays:
        (calendar.makeupSaturdays as unknown as SemesterCalendarConfig['makeupSaturdays']) ||
        [],
    };

    const result = generateTimetableCandidates({
      demands,
      calendar: calendarConfig,
      unavailability: unavailabilityList,
      options: {
        maxCandidates: options?.maxCandidates,
        timeoutMs: options?.timeoutMs,
      },
    });

    if (!result.ok) {
      throw new BadRequestException(
        `Failed to generate timetable draft: ${result.error}`,
      );
    }

    const candidate = result.candidates[0];
    const assignmentMap = new Map(assignments.map((a) => [a.id, a]));

    let createdById = options?.userId || options?.createdById;

    if (!createdById) {
      const defaultUser = await this.prisma.user.findFirst();

      createdById = defaultUser?.id ?? 'system';
    }

    const eventsCreate = (candidate?.events ?? []).map((event) => {
      const assignment = assignmentMap.get(event.teachingAssignmentId);

      return {
        teachingAssignmentId: event.teachingAssignmentId,
        date: new Date(event.date),
        pair: event.pair,
        pairSpan: event.pairSpan ?? 1,
        meetingUrlOverride: null,
        disciplineTitleSnapshot:
          assignment?.disciplineTitle ?? event.disciplineTitle,
        teachingTypeSnapshot: (assignment?.teachingType ??
          event.teachingType) as unknown as TeachingType,
        teacherIdSnapshot: assignment?.teacherId ?? event.teacherId,
        isCancelled: false,
      };
    });

    const version = await this.prisma.timetableVersion.create({
      data: {
        semesterCalendarId: calendar.id,
        status: 'DRAFT',
        createdById,
        events: {
          create: eventsCreate,
        },
      },
      include: {
        events: true,
      },
    });

    return {
      versionId: version.id,
      candidates: result.candidates,
      diagnostics: result.diagnostics,
    };
  }

  async publishTimetableVersion(
    versionId: string,
    _userId: string,
  ): Promise<TimetableVersionWithEvents> {
    const version = await this.prisma.timetableVersion.findUnique({
      where: { id: versionId },
      include: {
        events: {
          include: {
            teachingAssignment: {
              include: {
                group: true,
                stream: {
                  include: {
                    groups: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException(
        `Timetable version with ID '${versionId}' not found`,
      );
    }

    const unavailabilities = await this.prisma.teacherUnavailability.findMany({
      where: { isConfirmed: true },
    });

    const unavailabilityList: TeacherUnavailability[] = unavailabilities.map(
      (u) => ({
        teacherId: u.teacherId,
        date:
          u.date instanceof Date
            ? u.date.toISOString().slice(0, 10)
            : String(u.date).slice(0, 10),
        pair: u.pair,
        isConfirmed: u.isConfirmed,
      }),
    );

    const scheduledEvents: ScheduledEvent[] = version.events.map((event) => {
      const a = event.teachingAssignment;
      const groupIds: string[] = [];

      if (a?.groupId) {
        groupIds.push(a.groupId);
      }

      if (a?.stream?.groups) {
        for (const g of a.stream.groups) {
          if (!groupIds.includes(g.id)) {
            groupIds.push(g.id);
          }
        }
      }

      const dateStr =
        event.date instanceof Date
          ? event.date.toISOString().slice(0, 10)
          : String(event.date).slice(0, 10);

      return {
        id: event.id,
        teachingAssignmentId: event.teachingAssignmentId,
        disciplineTitle:
          event.disciplineTitleSnapshot ?? a?.disciplineTitle ?? '',
        teachingType: (event.teachingTypeSnapshot ??
          a?.teachingType) as unknown as ScheduledEvent['teachingType'],
        teacherId: event.teacherIdSnapshot ?? a?.teacherId ?? '',
        groupIds,
        date: dateStr,
        pair: event.pair,
        pairSpan: event.pairSpan,
        subgroupId: a?.subgroupId ?? undefined,
        streamId: a?.streamId ?? undefined,
        hasLateSlotAuthorization: a?.hasLateSlotAuthorization,
        isSaturdayOnly: a?.isSaturdayOnly,
      };
    });

    const conflictReport = checkTimetableConflicts({
      events: scheduledEvents,
      unavailability: unavailabilityList,
    });

    if (!conflictReport.isValid) {
      throw new ConflictException({
        message: 'Timetable version has conflicts and cannot be published',
        conflicts: conflictReport.hardConflicts,
      });
    }

    return this.prisma.timetableVersion.update({
      where: { id: versionId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      include: {
        events: true,
      },
    });
  }

  async getIcsFeed(token: string): Promise<string> {
    const tokenRecord = await this.prisma.calendarSubscriptionToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            roles: true,
            academicGroupId: true,
            academicSubgroupId: true,
          },
        },
      },
    });

    if (!tokenRecord || !tokenRecord.isActive) {
      throw new NotFoundException(
        'Calendar subscription token not found or inactive',
      );
    }

    await this.prisma.calendarSubscriptionToken.update({
      where: { id: tokenRecord.id },
      data: { lastAccessedAt: new Date() },
    });

    const user = tokenRecord.user;
    const userGroupId = user.academicGroupId;
    const userSubgroupId = user.academicSubgroupId;

    const orConditions: Prisma.TeachingAssignmentWhereInput[] = [
      { teacherId: user.id },
    ];

    if (userGroupId) {
      orConditions.push({ groupId: userGroupId });
      orConditions.push({
        stream: {
          groups: {
            some: {
              id: userGroupId,
            },
          },
        },
      });
    }

    if (userSubgroupId) {
      orConditions.push({ subgroupId: userSubgroupId });
    }

    const events = await this.prisma.timetableEvent.findMany({
      where: {
        timetableVersion: {
          status: 'PUBLISHED',
        },
        teachingAssignment: {
          OR: orConditions,
        },
      },
      include: {
        teachingAssignment: {
          include: {
            teacher: {
              select: TEACHER_SAFE_SELECT,
            },
            group: true,
            subgroup: true,
            stream: {
              include: {
                groups: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { pair: 'asc' }],
    });

    const icsEvents: IcsCalendarEvent[] = events.map((event) => {
      const a = event.teachingAssignment;
      const groupCodes: string[] = [];

      if (a?.group?.code) {
        groupCodes.push(a.group.code);
      }

      if (a?.stream?.groups) {
        for (const g of a.stream.groups) {
          if (!groupCodes.includes(g.code)) {
            groupCodes.push(g.code);
          }
        }
      }

      const dateStr =
        event.date instanceof Date
          ? event.date.toISOString().slice(0, 10)
          : String(event.date).slice(0, 10);

      return {
        id: event.id,
        disciplineTitle:
          event.disciplineTitleSnapshot ?? a?.disciplineTitle ?? 'Untitled',
        teachingType: (event.teachingTypeSnapshot ??
          a?.teachingType) as unknown as IcsCalendarEvent['teachingType'],
        date: dateStr,
        pair: event.pair,
        meetingUrl: event.meetingUrlOverride ?? a?.meetingUrl ?? undefined,
        groupCodes: groupCodes.length > 0 ? groupCodes : undefined,
        teacherName: a?.teacher?.name ?? undefined,
        isCancelled: event.isCancelled,
      };
    });

    return generateIcsCalendar({
      events: icsEvents,
      calendarName: 'UniVerse Timetable',
    });
  }

  async createSubscriptionToken(
    userId: string,
  ): Promise<CalendarSubscriptionToken> {
    const token = crypto.randomUUID();

    return this.prisma.calendarSubscriptionToken.create({
      data: {
        userId,
        token,
        isActive: true,
      },
    });
  }

  async updateMeetingUrl(
    assignmentId: string,
    meetingUrl: string | undefined,
    userContext: { userId: string; roles?: string[] },
  ): Promise<TeachingAssignment> {
    const assignment = await this.prisma.teachingAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Teaching assignment with ID '${assignmentId}' not found`,
      );
    }

    const { userId, roles = [] } = userContext;
    const isAdmin = roles.includes(Role.ADMIN) || roles.includes('ADMIN');

    if (assignment.teacherId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to update meeting URL for this assignment',
      );
    }

    return this.prisma.teachingAssignment.update({
      where: { id: assignmentId },
      data: { meetingUrl: meetingUrl ?? null },
    });
  }
}
