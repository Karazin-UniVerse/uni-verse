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
  TimetableDemandDeficit,
} from '@universe/core/types/timetable';
import {
  checkTimetableConflicts,
  generateIcsCalendar,
  generateTimetableCandidates,
  getPairsFromAcademicHours,
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

export const MAX_SOLVER_DEMANDS = 200;

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

export type GeneratedCandidateSummary = {
  versionId: string;
  candidateIndex: number;
  penaltyScore: number;
  eventCount: number;
};

export type GenerateTimetableDraftResult = {
  generationId: string;
  versionId: string;
  versionIds: string[];
  candidateSummaries: GeneratedCandidateSummary[];
  candidates: Array<
    TimetableCandidate & { versionId: string; candidateIndex: number }
  >;
  diagnostics: GenerateTimetableDiagnostics;
};

export type TimetableVersionWithEvents = TimetableVersion & {
  events: TimetableEvent[];
};

type AssignmentWithRelations = TeachingAssignment & {
  group?: AcademicGroup | null;
  subgroup?: AcademicSubgroup | null;
  stream?: (AcademicStream & { groups?: AcademicGroup[] }) | null;
};

function toIsoDateString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function buildGroupIds(assignment?: AssignmentWithRelations | null): string[] {
  const groupIds: string[] = [];

  if (assignment?.groupId) {
    groupIds.push(assignment.groupId);
  }

  if (
    assignment?.subgroup?.academicGroupId &&
    !groupIds.includes(assignment.subgroup.academicGroupId)
  ) {
    groupIds.push(assignment.subgroup.academicGroupId);
  }

  if (assignment?.stream?.groups) {
    for (const group of assignment.stream.groups) {
      if (!groupIds.includes(group.id)) {
        groupIds.push(group.id);
      }
    }
  }

  return groupIds;
}

function parseMakeupSaturdayDates(
  calendar?: SemesterCalendar | null,
): Set<string> {
  const raw = calendar?.makeupSaturdays;

  if (!Array.isArray(raw)) {
    return new Set<string>();
  }

  const dates = new Set<string>();

  for (const item of raw) {
    if (
      typeof item === 'object' &&
      item !== null &&
      'date' in item &&
      typeof (item as { date: unknown }).date === 'string'
    ) {
      dates.add((item as { date: string }).date);
    }
  }

  return dates;
}

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
    if (!dto.groupId && !dto.subgroupId && !dto.streamId) {
      throw new BadRequestException(
        'Teaching assignment must specify at least one of groupId, subgroupId, or streamId',
      );
    }

    let resolvedGroupId = dto.groupId;

    if (dto.subgroupId) {
      const subgroup = await this.prisma.academicSubgroup?.findUnique?.({
        where: { id: dto.subgroupId },
      });

      if (dto.groupId && subgroup && subgroup.academicGroupId !== dto.groupId) {
        throw new BadRequestException(
          `Subgroup '${dto.subgroupId}' does not belong to group '${dto.groupId}'`,
        );
      }

      if (dto.groupId && subgroup === null) {
        throw new BadRequestException(`Subgroup '${dto.subgroupId}' not found`);
      }

      if (!resolvedGroupId && subgroup?.academicGroupId) {
        resolvedGroupId = subgroup.academicGroupId;
      }
    }

    const created = await this.prisma.teachingAssignment.create({
      data: {
        curriculumPlanId: dto.curriculumPlanId,
        disciplineTitle: dto.disciplineTitle,
        teachingType: dto.teachingType,
        academicHours: dto.academicHours,
        teacherId: dto.teacherId,
        groupId: resolvedGroupId,
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

  async listTeacherAssignments(
    teacherId: string,
  ): Promise<TeachingAssignmentWithDetails[]> {
    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { teacherId },
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
    if (
      options?.maxCandidates !== undefined &&
      (!Number.isInteger(options.maxCandidates) ||
        options.maxCandidates < 1 ||
        options.maxCandidates > 5)
    ) {
      throw new BadRequestException('maxCandidates must be between 1 and 5');
    }

    if (
      options?.timeoutMs !== undefined &&
      (!Number.isInteger(options.timeoutMs) ||
        options.timeoutMs < 1 ||
        options.timeoutMs > 10000)
    ) {
      throw new BadRequestException('timeoutMs must be between 1 and 10000');
    }

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

    if (assignments.length > MAX_SOLVER_DEMANDS) {
      throw new BadRequestException(
        `Curriculum plan exceeds the maximum allowed demands (${MAX_SOLVER_DEMANDS})`,
      );
    }

    const unavailabilities = await this.prisma.teacherUnavailability.findMany({
      where: { isConfirmed: true },
    });

    const unavailabilityList: TeacherUnavailability[] = unavailabilities.map(
      (u) => ({
        teacherId: u.teacherId,
        date: toIsoDateString(u.date),
        pair: u.pair,
        isConfirmed: u.isConfirmed,
      }),
    );

    const publishedEventsRecords =
      (await this.prisma.timetableEvent?.findMany?.({
        where: {
          isCancelled: false,
          timetableVersion: {
            semesterCalendarId: calendar.id,
            status: 'PUBLISHED',
          },
          teachingAssignment: {
            curriculumPlanId: { not: planId },
          },
        },
        include: {
          teachingAssignment: {
            include: {
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
      })) ?? [];

    const makeupDates = parseMakeupSaturdayDates(calendar);
    const fixedEvents: ScheduledEvent[] = publishedEventsRecords.map(
      (event) => {
        const a = event.teachingAssignment;
        const dateStr = toIsoDateString(event.date);

        return {
          id: event.id,
          teachingAssignmentId: event.teachingAssignmentId,
          disciplineTitle:
            event.disciplineTitleSnapshot ?? a?.disciplineTitle ?? '',
          teachingType: (event.teachingTypeSnapshot ??
            a?.teachingType) as unknown as ScheduledEvent['teachingType'],
          teacherId: event.teacherIdSnapshot ?? a?.teacherId ?? '',
          groupIds: buildGroupIds(a),
          date: dateStr,
          pair: event.pair,
          pairSpan: event.pairSpan,
          subgroupId: a?.subgroupId ?? undefined,
          streamId: a?.streamId ?? undefined,
          hasLateSlotAuthorization: a?.hasLateSlotAuthorization,
          isSaturdayOnly: a?.isSaturdayOnly,
          isMakeupSaturday: makeupDates.has(dateStr),
        };
      },
    );

    const demands: TeachingDemand[] = assignments.map((a) => ({
      id: a.id,
      disciplineTitle: a.disciplineTitle,
      teachingType: a.teachingType as unknown as TeachingDemand['teachingType'],
      teacherId: a.teacherId,
      groupIds: buildGroupIds(a),
      academicHours: a.academicHours,
      subgroupId: a.subgroupId ?? undefined,
      streamId: a.streamId ?? undefined,
      isSaturdayOnly: a.isSaturdayOnly,
      hasLateSlotAuthorization: a.hasLateSlotAuthorization,
    }));

    const startDateStr = toIsoDateString(calendar.startDate);

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
      fixedEvents,
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

    const assignmentMap = new Map(assignments.map((a) => [a.id, a]));

    let createdById = options?.userId || options?.createdById;

    if (!createdById) {
      const defaultUser = await this.prisma.user.findFirst();

      createdById = defaultUser?.id ?? 'system';
    }

    const generationId = crypto.randomUUID();
    const versionIds: string[] = [];
    const candidateSummaries: GeneratedCandidateSummary[] = [];
    const persistedCandidates: Array<
      TimetableCandidate & { versionId: string; candidateIndex: number }
    > = [];

    for (const [candidateIndex, candidate] of result.candidates.entries()) {
      const eventsCreate = (candidate?.events ?? []).map((event) => {
        const assignment = assignmentMap.get(event.teachingAssignmentId);

        return {
          teachingAssignmentId: event.teachingAssignmentId,
          stableKey: `${event.teachingAssignmentId}:${event.date}:${event.pair}`,
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
          candidateIndex,
          generationId,
          createdById,
          events: {
            create: eventsCreate,
          },
        },
        include: {
          events: true,
        },
      });

      versionIds.push(version.id);
      candidateSummaries.push({
        versionId: version.id,
        candidateIndex,
        penaltyScore: candidate.penaltyScore,
        eventCount: candidate.events.length,
      });
      persistedCandidates.push({
        ...candidate,
        versionId: version.id,
        candidateIndex,
      });
    }

    return {
      generationId,
      versionId: versionIds[0] ?? '',
      versionIds,
      candidateSummaries,
      candidates: persistedCandidates,
      diagnostics: result.diagnostics,
    };
  }

  async publishTimetableVersion(
    versionId: string,
    _userId: string,
  ): Promise<TimetableVersionWithEvents> {
    const runInTransaction = async (
      tx: PrismaService,
    ): Promise<TimetableVersionWithEvents> => {
      const version = await tx.timetableVersion.findUnique({
        where: { id: versionId },
        include: {
          semesterCalendar: true,
          events: {
            include: {
              teachingAssignment: {
                include: {
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
          },
        },
      });

      if (!version) {
        throw new NotFoundException(
          `Timetable version with ID '${versionId}' not found`,
        );
      }

      if (version.status !== 'DRAFT') {
        throw new ConflictException(
          `Timetable version '${versionId}' is already ${version.status}`,
        );
      }

      const activeEvents = version.events.filter((e) => !e.isCancelled);

      if (activeEvents.length === 0) {
        throw new ConflictException(
          'Cannot publish an empty timetable version',
        );
      }

      const planIds = [
        ...new Set(
          activeEvents
            .map((e) => e.teachingAssignment?.curriculumPlanId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      const planAssignments =
        planIds.length > 0
          ? ((await tx.teachingAssignment?.findMany?.({
              where: { curriculumPlanId: { in: planIds } },
            })) ?? [])
          : [];

      const assignmentRecords = new Map<
        string,
        { id: string; academicHours?: number }
      >();

      for (const a of planAssignments) {
        assignmentRecords.set(a.id, a);
      }

      for (const e of activeEvents) {
        if (
          e.teachingAssignment &&
          !assignmentRecords.has(e.teachingAssignmentId)
        ) {
          assignmentRecords.set(e.teachingAssignmentId, {
            id: e.teachingAssignmentId,
            academicHours: e.teachingAssignment.academicHours,
          });
        }
      }

      const deficits: TimetableDemandDeficit[] = [];

      for (const [assignmentId, assignment] of assignmentRecords) {
        if (assignment.academicHours === undefined) {
          continue;
        }

        const pairsResult = getPairsFromAcademicHours(assignment.academicHours);
        const requiredPairs = pairsResult.ok
          ? pairsResult.pairs
          : Math.ceil(assignment.academicHours / 2);
        const scheduledCount = activeEvents.filter(
          (e) => e.teachingAssignmentId === assignmentId,
        ).length;

        if (scheduledCount !== requiredPairs) {
          deficits.push({
            demandId: assignmentId,
            required: requiredPairs,
            scheduled: scheduledCount,
          });
        }
      }

      if (deficits.length > 0) {
        throw new ConflictException({
          message:
            'Timetable version has incomplete workload and cannot be published',
          deficits,
        });
      }

      const unavailabilities = await tx.teacherUnavailability.findMany({
        where: { isConfirmed: true },
      });

      const unavailabilityList: TeacherUnavailability[] = unavailabilities.map(
        (u) => ({
          teacherId: u.teacherId,
          date: toIsoDateString(u.date),
          pair: u.pair,
          isConfirmed: u.isConfirmed,
        }),
      );

      const calendar =
        version.semesterCalendar ??
        (version.semesterCalendarId
          ? await tx.semesterCalendar?.findUnique?.({
              where: { id: version.semesterCalendarId },
            })
          : null);
      const makeupDates = parseMakeupSaturdayDates(calendar);

      const otherPublishedEventsRecords = version.semesterCalendarId
        ? ((await tx.timetableEvent?.findMany?.({
            where: {
              isCancelled: false,
              timetableVersionId: { not: versionId },
              timetableVersion: {
                semesterCalendarId: version.semesterCalendarId,
                status: 'PUBLISHED',
              },
              ...(planIds.length > 0
                ? {
                    teachingAssignment: {
                      curriculumPlanId: { notIn: planIds },
                    },
                  }
                : {}),
            },
            include: {
              teachingAssignment: {
                include: {
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
          })) ?? [])
        : [];

      const toScheduledEvent = (
        event: TimetableEvent & {
          teachingAssignment?: AssignmentWithRelations | null;
        },
      ): ScheduledEvent => {
        const a = event.teachingAssignment;
        const dateStr = toIsoDateString(event.date);

        return {
          id: event.id,
          teachingAssignmentId: event.teachingAssignmentId,
          disciplineTitle:
            event.disciplineTitleSnapshot ?? a?.disciplineTitle ?? '',
          teachingType: (event.teachingTypeSnapshot ??
            a?.teachingType) as unknown as ScheduledEvent['teachingType'],
          teacherId: event.teacherIdSnapshot ?? a?.teacherId ?? '',
          groupIds: buildGroupIds(a),
          date: dateStr,
          pair: event.pair,
          pairSpan: event.pairSpan,
          subgroupId: a?.subgroupId ?? undefined,
          streamId: a?.streamId ?? undefined,
          hasLateSlotAuthorization: a?.hasLateSlotAuthorization,
          isSaturdayOnly: a?.isSaturdayOnly,
          isMakeupSaturday: makeupDates.has(dateStr),
        };
      };

      const scheduledEvents: ScheduledEvent[] = [
        ...otherPublishedEventsRecords.map(toScheduledEvent),
        ...activeEvents.map(toScheduledEvent),
      ];

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

      if (version.semesterCalendarId && tx.timetableVersion.updateMany) {
        await tx.timetableVersion.updateMany({
          where: {
            semesterCalendarId: version.semesterCalendarId,
            status: 'PUBLISHED',
            id: { not: versionId },
          },
          data: {
            status: 'ARCHIVED',
          },
        });
      }

      const publishedAt = new Date();

      try {
        return await tx.timetableVersion.update({
          where: { id: versionId, status: 'DRAFT' },
          data: {
            status: 'PUBLISHED',
            publishedAt,
          },
          include: {
            events: true,
          },
        });
      } catch {
        throw new ConflictException(
          `Timetable version '${versionId}' could not be published because it is no longer a draft`,
        );
      }
    };

    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction((tx) =>
        runInTransaction(tx as unknown as PrismaService),
      );
    }

    return runInTransaction(this.prisma);
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
      orConditions.push({ groupId: userGroupId, subgroupId: null });
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

    let publishedVersionFilter: Prisma.TimetableEventWhereInput = {
      timetableVersion: {
        status: 'PUBLISHED',
      },
    };

    if (typeof this.prisma.timetableVersion?.findMany === 'function') {
      const publishedVersions = await this.prisma.timetableVersion.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, semesterCalendarId: true },
      });

      if (publishedVersions && publishedVersions.length > 0) {
        const latestByCalendar = new Map<string, string>();

        for (const v of publishedVersions) {
          const calKey = v.semesterCalendarId ?? v.id;

          if (!latestByCalendar.has(calKey)) {
            latestByCalendar.set(calKey, v.id);
          }
        }

        publishedVersionFilter = {
          timetableVersionId: { in: [...latestByCalendar.values()] },
          timetableVersion: {
            status: 'PUBLISHED',
          },
        };
      }
    }

    const events = await this.prisma.timetableEvent.findMany({
      where: {
        ...publishedVersionFilter,
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

    const filteredEvents = events.filter((event) => {
      const a = event.teachingAssignment;

      if (!a) {
        return true;
      }

      if (a.teacherId === user.id) {
        return true;
      }

      if (a.subgroupId) {
        return Boolean(userSubgroupId && a.subgroupId === userSubgroupId);
      }

      return true;
    });

    const icsEvents: IcsCalendarEvent[] = filteredEvents.map((event) => {
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

      const dateStr = toIsoDateString(event.date);
      const stableId =
        event.stableKey ||
        (event.teachingAssignmentId
          ? `${event.teachingAssignmentId}:${dateStr}:${event.pair}`
          : event.id);

      return {
        id: stableId,
        disciplineTitle:
          event.disciplineTitleSnapshot ?? a?.disciplineTitle ?? 'Untitled',
        teachingType: (event.teachingTypeSnapshot ??
          a?.teachingType) as unknown as IcsCalendarEvent['teachingType'],
        date: dateStr,
        pair: event.pair,
        pairSpan: event.pairSpan,
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
    if (typeof this.prisma.calendarSubscriptionToken.findFirst === 'function') {
      const existing = await this.prisma.calendarSubscriptionToken.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        return existing;
      }
    }

    const token = crypto.randomBytes(32).toString('base64url');

    return this.prisma.calendarSubscriptionToken.create({
      data: {
        userId,
        token,
        isActive: true,
      },
    });
  }

  async rotateSubscriptionToken(
    userId: string,
  ): Promise<CalendarSubscriptionToken> {
    const token = crypto.randomBytes(32).toString('base64url');

    const rotate = async (
      tx: PrismaService,
    ): Promise<CalendarSubscriptionToken> => {
      await tx.calendarSubscriptionToken.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      return tx.calendarSubscriptionToken.create({
        data: {
          userId,
          token,
          isActive: true,
        },
      });
    };

    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction((tx) =>
        rotate(tx as unknown as PrismaService),
      );
    }

    return rotate(this.prisma);
  }

  async revokeSubscriptionTokens(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.calendarSubscriptionToken.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    return { count: result.count };
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
