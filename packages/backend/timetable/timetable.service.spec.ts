import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role, TeachingType } from '@universe/database';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_SOLVER_DEMANDS, TimetableService } from './timetable.service';
import type {
  CreateAcademicGroupDto,
  CreateCurriculumPlanDto,
  CreateSemesterCalendarDto,
  CreateTeacherUnavailabilityDto,
  CreateTeachingAssignmentDto,
} from './dto';

describe('TimetableService', () => {
  let service: TimetableService;

  const mockAcademicGroupPrisma = {
    create: jest.fn(),
    findMany: jest.fn(),
  };

  const mockAcademicSubgroupPrisma = {
    findUnique: jest.fn(),
  };

  const mockCurriculumPlanPrisma = {
    create: jest.fn(),
    findUnique: jest.fn(),
  };

  const mockTeachingAssignmentPrisma = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const mockSemesterCalendarPrisma = {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  };

  const mockTeacherUnavailabilityPrisma = {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  };

  const mockTimetableVersionPrisma = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockTimetableEventPrisma = {
    findMany: jest.fn(),
  };

  const mockCalendarSubscriptionTokenPrisma = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockUserPrisma = {
    findFirst: jest.fn(),
  };

  const mockPrismaTables = {
    academicGroup: mockAcademicGroupPrisma,
    academicSubgroup: mockAcademicSubgroupPrisma,
    curriculumPlan: mockCurriculumPlanPrisma,
    teachingAssignment: mockTeachingAssignmentPrisma,
    semesterCalendar: mockSemesterCalendarPrisma,
    teacherUnavailability: mockTeacherUnavailabilityPrisma,
    timetableVersion: mockTimetableVersionPrisma,
    timetableEvent: mockTimetableEventPrisma,
    calendarSubscriptionToken: mockCalendarSubscriptionTokenPrisma,
    user: mockUserPrisma,
  };

  const mockPrismaService = {
    ...mockPrismaTables,
    $transaction: jest.fn(
      async <T>(cb: (tx: typeof mockPrismaTables) => Promise<T>): Promise<T> =>
        cb(mockPrismaTables),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaService.$transaction.mockImplementation(
      async <T>(cb: (tx: typeof mockPrismaTables) => Promise<T>): Promise<T> =>
        cb(mockPrismaTables),
    );
    mockTimetableEventPrisma.findMany.mockResolvedValue([]);
    mockTimetableVersionPrisma.findMany.mockResolvedValue([]);
    mockTimetableVersionPrisma.updateMany.mockResolvedValue({ count: 0 });
    mockTeachingAssignmentPrisma.findMany.mockResolvedValue([]);
    mockCalendarSubscriptionTokenPrisma.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TimetableService>(TimetableService);
  });

  describe('createAcademicGroup and listAcademicGroups', () => {
    it('creates an academic group with subgroups', async () => {
      const dto: CreateAcademicGroupDto = {
        code: 'CS-101',
        degreeLevel: 'BACHELOR',
        studyForm: 'FULL_TIME',
        entryYear: 2026,
        academicYear: '2026/2027',
        subgroups: ['Subgroup 1', 'Subgroup 2'],
      };

      const expectedResult = { id: 'group-1', ...dto };

      mockAcademicGroupPrisma.create.mockResolvedValue(expectedResult);

      const result = await service.createAcademicGroup(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAcademicGroupPrisma.create).toHaveBeenCalledWith({
        data: {
          code: dto.code,
          degreeLevel: dto.degreeLevel,
          studyForm: dto.studyForm,
          entryYear: dto.entryYear,
          academicYear: dto.academicYear,
          subgroups: {
            create: [{ name: 'Subgroup 1' }, { name: 'Subgroup 2' }],
          },
        },
        include: { subgroups: true },
      });
    });

    it('lists academic groups', async () => {
      const groups = [{ id: 'group-1', code: 'CS-101' }];

      mockAcademicGroupPrisma.findMany.mockResolvedValue(groups);

      const result = await service.listAcademicGroups();

      expect(result).toEqual(groups);
      expect(mockAcademicGroupPrisma.findMany).toHaveBeenCalledWith({
        include: { subgroups: true },
        orderBy: { code: 'asc' },
      });
    });
  });

  describe('curriculum plans', () => {
    it('creates a curriculum plan', async () => {
      const dto: CreateCurriculumPlanDto = {
        faculty: 'CS',
        title: 'BSc 2026 Sem 1',
        academicYear: '2026/2027',
        semester: 1,
        isDraft: true,
      };

      const created = { id: 'plan-1', ...dto };

      mockCurriculumPlanPrisma.create.mockResolvedValue(created);

      const result = await service.createCurriculumPlan(dto);

      expect(result).toEqual(created);
    });

    it('returns plan when found with safe teacher projection', async () => {
      const plan = {
        id: 'plan-1',
        title: 'BSc 2026 Sem 1',
        teachingAssignments: [
          {
            id: 'assign-1',
            teacher: {
              id: 'teacher-1',
              name: 'Prof Smith',
              roles: [Role.INSTRUCTOR],
            },
          },
        ],
      };

      mockCurriculumPlanPrisma.findUnique.mockResolvedValue(plan);

      const result = await service.getCurriculumPlan('plan-1');

      expect(result).toEqual(plan);
      expect(mockCurriculumPlanPrisma.findUnique).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        include: {
          teachingAssignments: {
            include: {
              teacher: {
                select: {
                  id: true,
                  name: true,
                  roles: true,
                },
              },
              group: true,
              subgroup: true,
              stream: true,
            },
          },
        },
      });
    });

    it('throws NotFoundException when plan is not found', async () => {
      mockCurriculumPlanPrisma.findUnique.mockResolvedValue(null);

      await expect(service.getCurriculumPlan('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('teaching assignments', () => {
    it('creates a teaching assignment with safe teacher projection', async () => {
      const dto: CreateTeachingAssignmentDto = {
        curriculumPlanId: 'plan-1',
        disciplineTitle: 'Calculus',
        teachingType: TeachingType.LECTURE,
        academicHours: 32,
        teacherId: 'teacher-1',
        groupId: 'group-1',
        isSaturdayOnly: false,
        hasLateSlotAuthorization: false,
      };

      const created = {
        id: 'assign-1',
        ...dto,
        teacher: {
          id: 'teacher-1',
          name: 'Prof Smith',
          roles: [Role.INSTRUCTOR],
        },
      };

      mockTeachingAssignmentPrisma.create.mockResolvedValue(created);

      const result = await service.createTeachingAssignment(dto);

      expect(result).toEqual(created);
      expect(mockTeachingAssignmentPrisma.create).toHaveBeenCalledWith({
        data: {
          curriculumPlanId: dto.curriculumPlanId,
          disciplineTitle: dto.disciplineTitle,
          teachingType: dto.teachingType,
          academicHours: dto.academicHours,
          teacherId: dto.teacherId,
          groupId: dto.groupId,
          subgroupId: undefined,
          streamId: undefined,
          isSaturdayOnly: false,
          hasLateSlotAuthorization: false,
          meetingUrl: undefined,
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              roles: true,
            },
          },
          group: true,
          subgroup: true,
          stream: true,
        },
      });
    });

    it('rejects assignment without groupId, subgroupId, or streamId', async () => {
      const dto = {
        curriculumPlanId: 'plan-1',
        disciplineTitle: 'Calculus',
        teachingType: TeachingType.LECTURE,
        academicHours: 32,
        teacherId: 'teacher-1',
      } as CreateTeachingAssignmentDto;

      await expect(service.createTeachingAssignment(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects assignment when subgroupId does not belong to groupId', async () => {
      mockAcademicSubgroupPrisma.findUnique.mockResolvedValue({
        id: 'subgroup-2',
        academicGroupId: 'other-group',
      });

      const dto: CreateTeachingAssignmentDto = {
        curriculumPlanId: 'plan-1',
        disciplineTitle: 'Lab',
        teachingType: TeachingType.LABORATORY,
        academicHours: 32,
        teacherId: 'teacher-1',
        groupId: 'group-1',
        subgroupId: 'subgroup-2',
      };

      await expect(service.createTeachingAssignment(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lists teaching assignments by planId with safe teacher projection', async () => {
      const assignments = [
        {
          id: 'assign-1',
          disciplineTitle: 'Calculus',
          teacher: {
            id: 'teacher-1',
            name: 'Prof Smith',
            roles: [Role.INSTRUCTOR],
          },
        },
      ];

      mockTeachingAssignmentPrisma.findMany.mockResolvedValue(assignments);

      const result = await service.listTeachingAssignments('plan-1');

      expect(result).toEqual(assignments);
      expect(mockTeachingAssignmentPrisma.findMany).toHaveBeenCalledWith({
        where: { curriculumPlanId: 'plan-1' },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              roles: true,
            },
          },
          group: true,
          subgroup: true,
          stream: true,
        },
        orderBy: { disciplineTitle: 'asc' },
      });
    });

    it('lists teacher assignments by teacherId', async () => {
      const assignments = [
        {
          id: 'assign-1',
          disciplineTitle: 'Calculus',
          teacherId: 'teacher-1',
        },
      ];

      mockTeachingAssignmentPrisma.findMany.mockResolvedValue(assignments);

      const result = await service.listTeacherAssignments('teacher-1');

      expect(result).toEqual(assignments);
      expect(mockTeachingAssignmentPrisma.findMany).toHaveBeenCalledWith({
        where: { teacherId: 'teacher-1' },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              roles: true,
            },
          },
          group: true,
          subgroup: true,
          stream: true,
        },
        orderBy: { disciplineTitle: 'asc' },
      });
    });

    it('does not return teacher password, token, or refreshToken', async () => {
      const safeTeacher = {
        id: 'teacher-1',
        name: 'Prof Smith',
        roles: [Role.INSTRUCTOR],
      };
      const assignment = {
        id: 'assign-1',
        disciplineTitle: 'Calculus',
        teacher: safeTeacher,
      };

      mockTeachingAssignmentPrisma.findMany.mockResolvedValue([assignment]);

      const result = await service.listTeachingAssignments('plan-1');

      const returnedTeacher = result[0].teacher as Record<string, unknown>;

      expect(returnedTeacher.password).toBeUndefined();
      expect(returnedTeacher.token).toBeUndefined();
      expect(returnedTeacher.refreshToken).toBeUndefined();
      expect(returnedTeacher.id).toBe('teacher-1');
    });
  });

  describe('semester calendar', () => {
    it('configures semester calendar with upsert', async () => {
      const dto: CreateSemesterCalendarDto = {
        academicYear: '2026/2027',
        semester: 1,
        startDate: '2026-09-07',
        teachingWeeks: 16,
        excludedDates: ['2026-10-14'],
        makeupSaturdays: [],
      };

      const upserted = {
        id: 'cal-1',
        ...dto,
        startDate: new Date(dto.startDate),
      };

      mockSemesterCalendarPrisma.upsert.mockResolvedValue(upserted);

      const result = await service.configureSemesterCalendar(dto);

      expect(result).toEqual(upserted);
    });

    it('returns semester calendar when found', async () => {
      const calendar = { id: 'cal-1', academicYear: '2026/2027', semester: 1 };

      mockSemesterCalendarPrisma.findUnique.mockResolvedValue(calendar);

      const result = await service.getSemesterCalendar('2026/2027', 1);

      expect(result).toEqual(calendar);
    });

    it('throws NotFoundException when semester calendar is not found', async () => {
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue(null);

      await expect(service.getSemesterCalendar('2026/2027', 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('teacher unavailability', () => {
    it('requests teacher unavailability', async () => {
      const dto: CreateTeacherUnavailabilityDto = {
        date: '2026-09-10',
        pair: 2,
        reason: 'Conference',
      };

      const resultRecord = {
        id: 'unavail-1',
        teacherId: 'teacher-1',
        ...dto,
        isConfirmed: false,
      };

      mockTeacherUnavailabilityPrisma.upsert.mockResolvedValue(resultRecord);

      const result = await service.requestTeacherUnavailability(
        'teacher-1',
        dto,
      );

      expect(result).toEqual(resultRecord);
    });

    it('strictly uses teacherId argument and ignores any teacherId passed in body', async () => {
      const dto = {
        date: '2026-09-10',
        pair: 2,
        reason: 'Conference',
        teacherId: 'malicious-teacher-override',
      } as unknown as CreateTeacherUnavailabilityDto;

      const dateObj = new Date('2026-09-10');
      const resultRecord = {
        id: 'unavail-1',
        teacherId: 'authorized-teacher-1',
        date: dateObj,
        pair: 2,
        reason: 'Conference',
        isConfirmed: false,
      };

      mockTeacherUnavailabilityPrisma.upsert.mockResolvedValue(resultRecord);

      const result = await service.requestTeacherUnavailability(
        'authorized-teacher-1',
        dto,
      );

      expect(result).toEqual(resultRecord);
    });

    it('confirms teacher unavailability', async () => {
      mockTeacherUnavailabilityPrisma.findUnique.mockResolvedValue({
        id: 'unavail-1',
      });
      mockTeacherUnavailabilityPrisma.update.mockResolvedValue({
        id: 'unavail-1',
        isConfirmed: true,
      });

      const result = await service.confirmTeacherUnavailability(
        'unavail-1',
        true,
      );

      expect(result.isConfirmed).toBe(true);
    });

    it('throws NotFoundException when confirming nonexistent unavailability', async () => {
      mockTeacherUnavailabilityPrisma.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmTeacherUnavailability('unavail-999', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateTimetableDraft', () => {
    it('generates candidates, persists EVERY candidate with generationId, candidateIndex, and stableKey', async () => {
      const plan = {
        id: 'plan-1',
        academicYear: '2026/2027',
        semester: 1,
      };
      const calendar = {
        id: 'cal-1',
        academicYear: '2026/2027',
        semester: 1,
        startDate: new Date('2026-09-07'),
        teachingWeeks: 16,
        excludedDates: [],
        makeupSaturdays: [],
      };
      const assignments = [
        {
          id: 'assign-1',
          curriculumPlanId: 'plan-1',
          disciplineTitle: 'Calculus',
          teachingType: TeachingType.LECTURE,
          academicHours: 32,
          teacherId: 'teacher-1',
          groupId: 'group-1',
          subgroupId: null,
          streamId: null,
          isSaturdayOnly: false,
          hasLateSlotAuthorization: false,
        },
      ];

      mockCurriculumPlanPrisma.findUnique.mockResolvedValue(plan);
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue(calendar);
      mockTeachingAssignmentPrisma.findMany.mockResolvedValue(assignments);
      mockTeacherUnavailabilityPrisma.findMany.mockResolvedValue([]);
      mockTimetableEventPrisma.findMany.mockResolvedValue([]);
      mockUserPrisma.findFirst.mockResolvedValue({ id: 'admin-1' });

      let counter = 0;

      mockTimetableVersionPrisma.create.mockImplementation(async ({ data }) => {
        counter += 1;

        return {
          id: `ver-${counter}`,
          status: 'DRAFT',
          semesterCalendarId: data.semesterCalendarId,
          candidateIndex: data.candidateIndex,
          generationId: data.generationId,
          events: data.events.create,
        };
      });

      const result = await service.generateTimetableDraft('plan-1', {
        maxCandidates: 2,
        userId: 'admin-1',
      });

      expect(result.versionId).toBe('ver-1');
      expect(result.versionIds).toEqual(['ver-1', 'ver-2']);
      expect(result.candidateSummaries).toHaveLength(2);
      expect(result.candidateSummaries[0]).toMatchObject({
        versionId: 'ver-1',
        candidateIndex: 0,
      });
      expect(result.candidateSummaries[1]).toMatchObject({
        versionId: 'ver-2',
        candidateIndex: 1,
      });
      expect(mockTimetableVersionPrisma.create).toHaveBeenCalledTimes(2);

      const firstCreateCall =
        mockTimetableVersionPrisma.create.mock.calls[0][0];

      expect(firstCreateCall.data.candidateIndex).toBe(0);
      expect(typeof firstCreateCall.data.generationId).toBe('string');
      expect(firstCreateCall.data.events.create[0].stableKey).toMatch(
        /^assign-1:\d{4}-\d{2}-\d{2}:\d+$/,
      );
    });

    it('rejects generation when demands exceed MAX_SOLVER_DEMANDS (200)', async () => {
      const plan = { id: 'plan-1', academicYear: '2026/2027', semester: 1 };
      const calendar = {
        id: 'cal-1',
        academicYear: '2026/2027',
        semester: 1,
        startDate: new Date('2026-09-07'),
        teachingWeeks: 16,
        excludedDates: [],
        makeupSaturdays: [],
      };
      const assignments = Array.from(
        { length: MAX_SOLVER_DEMANDS + 1 },
        (_, idx) => ({
          id: `assign-${idx}`,
          curriculumPlanId: 'plan-1',
          disciplineTitle: `Course ${idx}`,
          teachingType: TeachingType.LECTURE,
          academicHours: 32,
          teacherId: 'teacher-1',
          groupId: 'group-1',
        }),
      );

      mockCurriculumPlanPrisma.findUnique.mockResolvedValue(plan);
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue(calendar);
      mockTeachingAssignmentPrisma.findMany.mockResolvedValue(assignments);

      await expect(service.generateTimetableDraft('plan-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when generator finds invalid input', async () => {
      const plan = { id: 'plan-1', academicYear: '2026/2027', semester: 1 };
      const calendar = {
        id: 'cal-1',
        academicYear: '2026/2027',
        semester: 1,
        startDate: new Date('2026-09-07'),
        teachingWeeks: 16,
        excludedDates: [],
        makeupSaturdays: [],
      };
      const assignments = [
        {
          id: 'assign-1',
          curriculumPlanId: 'plan-1',
          disciplineTitle: 'Invalid',
          teachingType: TeachingType.LECTURE,
          academicHours: 5,
          teacherId: 'teacher-1',
          groupId: 'group-1',
        },
      ];

      mockCurriculumPlanPrisma.findUnique.mockResolvedValue(plan);
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue(calendar);
      mockTeachingAssignmentPrisma.findMany.mockResolvedValue(assignments);
      mockTeacherUnavailabilityPrisma.findMany.mockResolvedValue([]);

      await expect(service.generateTimetableDraft('plan-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('publishTimetableVersion', () => {
    it('throws NotFoundException when timetable version does not exist', async () => {
      mockTimetableVersionPrisma.findUnique.mockResolvedValue(null);

      await expect(
        service.publishTimetableVersion('missing-ver', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects empty timetable version with ConflictException', async () => {
      mockTimetableVersionPrisma.findUnique.mockResolvedValue({
        id: 'ver-empty',
        status: 'DRAFT',
        semesterCalendarId: 'cal-1',
        events: [],
      });

      await expect(
        service.publishTimetableVersion('ver-empty', 'admin-1'),
      ).rejects.toThrow(
        new ConflictException('Cannot publish an empty timetable version'),
      );
    });

    it('rejects version when assignment non-cancelled event count has a deficit', async () => {
      const version = {
        id: 'ver-deficit',
        status: 'DRAFT',
        semesterCalendarId: 'cal-1',
        events: [
          {
            id: 'evt-1',
            teachingAssignmentId: 'assign-1',
            date: new Date('2026-09-07'),
            pair: 1,
            pairSpan: 1,
            isCancelled: false,
            disciplineTitleSnapshot: 'Calculus',
            teachingTypeSnapshot: TeachingType.LECTURE,
            teacherIdSnapshot: 'teacher-1',
            teachingAssignment: {
              id: 'assign-1',
              curriculumPlanId: 'plan-1',
              academicHours: 4, // requires 2 pairs, only 1 scheduled
              groupId: 'group-1',
            },
          },
        ],
      };

      mockTimetableVersionPrisma.findUnique.mockResolvedValue(version);
      mockTeachingAssignmentPrisma.findMany.mockResolvedValue([
        {
          id: 'assign-1',
          curriculumPlanId: 'plan-1',
          academicHours: 4,
          groupId: 'group-1',
        },
      ]);

      await expect(
        service.publishTimetableVersion('ver-deficit', 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('validates conflicts, archives previous PUBLISHED version, and updates status to PUBLISHED atomically', async () => {
      const version = {
        id: 'ver-1',
        status: 'DRAFT',
        semesterCalendarId: 'cal-1',
        semesterCalendar: {
          id: 'cal-1',
          makeupSaturdays: [{ date: '2026-09-12', followsWeekday: 1 }],
        },
        events: [
          {
            id: 'evt-1',
            teachingAssignmentId: 'assign-1',
            date: new Date('2026-09-12'), // Makeup Saturday!
            pair: 1,
            pairSpan: 1,
            isCancelled: false,
            disciplineTitleSnapshot: 'Calculus',
            teachingTypeSnapshot: TeachingType.LECTURE,
            teacherIdSnapshot: 'teacher-1',
            teachingAssignment: {
              id: 'assign-1',
              curriculumPlanId: 'plan-1',
              academicHours: 2,
              groupId: null,
              subgroupId: 'sub-1',
              subgroup: { id: 'sub-1', academicGroupId: 'group-1' },
              stream: null,
              isSaturdayOnly: false,
              hasLateSlotAuthorization: false,
            },
          },
        ],
      };

      mockTimetableVersionPrisma.findUnique.mockResolvedValue(version);
      mockTeachingAssignmentPrisma.findMany.mockResolvedValue([
        {
          id: 'assign-1',
          curriculumPlanId: 'plan-1',
          academicHours: 2,
        },
      ]);
      mockTeacherUnavailabilityPrisma.findMany.mockResolvedValue([]);
      mockTimetableEventPrisma.findMany.mockResolvedValue([]);
      mockTimetableVersionPrisma.update.mockResolvedValue({
        ...version,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      });

      const published = await service.publishTimetableVersion(
        'ver-1',
        'admin-1',
      );

      expect(published.status).toBe('PUBLISHED');
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      expect(mockTimetableVersionPrisma.updateMany).toHaveBeenCalledWith({
        where: {
          semesterCalendarId: 'cal-1',
          events: {
            some: {
              teachingAssignment: {
                curriculumPlanId: 'plan-1',
              },
            },
          },
          status: 'PUBLISHED',
          id: { not: 'ver-1' },
        },
        data: { status: 'ARCHIVED' },
      });
      expect(mockTimetableVersionPrisma.update).toHaveBeenCalledWith({
        where: { id: 'ver-1', status: 'DRAFT' },
        data: {
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
        },
        include: { events: true },
      });
    });

    it('detects cross-plan collision with already-PUBLISHED version events', async () => {
      const version = {
        id: 'ver-1',
        status: 'DRAFT',
        semesterCalendarId: 'cal-1',
        events: [
          {
            id: 'evt-new',
            teachingAssignmentId: 'assign-1',
            date: new Date('2026-09-07'),
            pair: 1,
            pairSpan: 1,
            isCancelled: false,
            disciplineTitleSnapshot: 'Calculus',
            teachingTypeSnapshot: TeachingType.LECTURE,
            teacherIdSnapshot: 'teacher-shared',
            teachingAssignment: {
              id: 'assign-1',
              curriculumPlanId: 'plan-1',
              academicHours: 2,
              groupId: 'group-1',
            },
          },
        ],
      };

      mockTimetableVersionPrisma.findUnique.mockResolvedValue(version);
      mockTeachingAssignmentPrisma.findMany.mockResolvedValue([
        { id: 'assign-1', curriculumPlanId: 'plan-1', academicHours: 2 },
      ]);
      mockTeacherUnavailabilityPrisma.findMany.mockResolvedValue([]);
      // Other plan's published event with the same teacher at the same slot
      mockTimetableEventPrisma.findMany.mockResolvedValue([
        {
          id: 'evt-other-plan',
          teachingAssignmentId: 'assign-other',
          date: new Date('2026-09-07'),
          pair: 1,
          pairSpan: 1,
          isCancelled: false,
          disciplineTitleSnapshot: 'Algebra',
          teachingTypeSnapshot: TeachingType.LECTURE,
          teacherIdSnapshot: 'teacher-shared',
          teachingAssignment: {
            id: 'assign-other',
            curriculumPlanId: 'plan-2',
            groupId: 'group-2',
          },
        },
      ]);

      await expect(
        service.publishTimetableVersion('ver-1', 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when hard conflicts are detected within version', async () => {
      const version = {
        id: 'ver-1',
        status: 'DRAFT',
        semesterCalendarId: 'cal-1',
        events: [
          {
            id: 'evt-1',
            teachingAssignmentId: 'assign-1',
            date: new Date('2026-09-07'),
            pair: 1,
            isCancelled: false,
            disciplineTitleSnapshot: 'Calculus',
            teachingTypeSnapshot: TeachingType.LECTURE,
            teacherIdSnapshot: 'teacher-1',
            teachingAssignment: {
              id: 'assign-1',
              academicHours: 2,
              groupId: 'group-1',
            },
          },
          {
            id: 'evt-2',
            teachingAssignmentId: 'assign-2',
            date: new Date('2026-09-07'),
            pair: 1,
            isCancelled: false,
            disciplineTitleSnapshot: 'Physics',
            teachingTypeSnapshot: TeachingType.LECTURE,
            teacherIdSnapshot: 'teacher-1',
            teachingAssignment: {
              id: 'assign-2',
              academicHours: 2,
              groupId: 'group-2',
            },
          },
        ],
      };

      mockTimetableVersionPrisma.findUnique.mockResolvedValue(version);
      mockTeacherUnavailabilityPrisma.findMany.mockResolvedValue([]);

      await expect(
        service.publishTimetableVersion('ver-1', 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getIcsFeed', () => {
    it('throws NotFoundException if subscription token is invalid or inactive', async () => {
      mockCalendarSubscriptionTokenPrisma.findUnique.mockResolvedValue(null);

      await expect(service.getIcsFeed('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('generates valid ICS calendar for authenticated teacher using stableKey and pairSpan', async () => {
      const tokenRecord = {
        id: 'sub-token-1',
        token: 'valid-token',
        isActive: true,
        userId: 'teacher-1',
        user: {
          id: 'teacher-1',
          roles: [Role.INSTRUCTOR],
          name: 'Prof Smith',
          academicGroupId: null,
          academicSubgroupId: null,
        },
      };

      mockCalendarSubscriptionTokenPrisma.findUnique.mockResolvedValue(
        tokenRecord,
      );
      mockCalendarSubscriptionTokenPrisma.update.mockResolvedValue({});
      mockTimetableVersionPrisma.findMany.mockResolvedValue([
        { id: 'ver-pub-latest', semesterCalendarId: 'cal-1' },
      ]);

      const events = [
        {
          id: 'evt-random-uuid',
          stableKey: 'assign-1:2026-09-07:1',
          teachingAssignmentId: 'assign-1',
          date: new Date('2026-09-07'),
          pair: 1,
          pairSpan: 2,
          isCancelled: true,
          disciplineTitleSnapshot: 'Calculus',
          teachingTypeSnapshot: TeachingType.LECTURE,
          meetingUrlOverride: 'https://meet.google.com/test',
          teachingAssignment: {
            teacherId: 'teacher-1',
            disciplineTitle: 'Calculus',
            teachingType: TeachingType.LECTURE,
            teacher: { name: 'Prof Smith' },
            group: { code: 'CS-101' },
            stream: null,
            meetingUrl: 'https://meet.google.com/test',
          },
        },
      ];

      mockTimetableEventPrisma.findMany.mockResolvedValue(events);

      const ics = await service.getIcsFeed('valid-token');

      expect(ics).toContain(
        'UID:assign-1:2026-09-07:1@timetable.universe.karazin.ua',
      );
      expect(ics).toContain('STATUS:CANCELLED');
      expect(ics).toContain('DTSTART;TZID=Europe/Kyiv:20260907T083000');
      expect(ics).toContain('DTEND;TZID=Europe/Kyiv:20260907T113000');
      expect(mockCalendarSubscriptionTokenPrisma.update).toHaveBeenCalledWith({
        where: { id: 'sub-token-1' },
        data: { lastAccessedAt: expect.any(Date) },
      });
    });

    it('generates ICS calendar for student matching group-wide assignments (subgroupId: null) and excludes other subgroups', async () => {
      const tokenRecord = {
        id: 'sub-token-student',
        token: 'student-token',
        isActive: true,
        userId: 'student-1',
        user: {
          id: 'student-1',
          roles: [Role.OPPORTUNITIES_USER],
          name: 'John Doe',
          academicGroupId: 'group-101',
          academicSubgroupId: 'subgroup-1',
        },
      };

      mockCalendarSubscriptionTokenPrisma.findUnique.mockResolvedValue(
        tokenRecord,
      );
      mockCalendarSubscriptionTokenPrisma.update.mockResolvedValue({});

      const groupEvents = [
        {
          id: 'evt-group',
          stableKey: 'assign-group:2026-09-08:2',
          teachingAssignmentId: 'assign-group',
          date: new Date('2026-09-08'),
          pair: 2,
          pairSpan: 1,
          isCancelled: false,
          disciplineTitleSnapshot: 'Software Engineering',
          teachingTypeSnapshot: TeachingType.LECTURE,
          meetingUrlOverride: null,
          teachingAssignment: {
            disciplineTitle: 'Software Engineering',
            teachingType: TeachingType.LECTURE,
            groupId: 'group-101',
            subgroupId: null,
            group: { code: 'CS-201' },
            teacher: { name: 'Dr. Jones' },
            stream: null,
          },
        },
        {
          id: 'evt-other-subgroup',
          stableKey: 'assign-sub2:2026-09-08:3',
          teachingAssignmentId: 'assign-sub2',
          date: new Date('2026-09-08'),
          pair: 3,
          pairSpan: 1,
          isCancelled: false,
          disciplineTitleSnapshot: 'Other Subgroup Lab',
          teachingTypeSnapshot: TeachingType.LABORATORY,
          meetingUrlOverride: null,
          teachingAssignment: {
            disciplineTitle: 'Other Subgroup Lab',
            teachingType: TeachingType.LABORATORY,
            groupId: 'group-101',
            subgroupId: 'subgroup-2',
            group: { code: 'CS-201' },
            teacher: { name: 'Dr. Jones' },
            stream: null,
          },
        },
      ];

      mockTimetableEventPrisma.findMany.mockResolvedValue(groupEvents);

      const ics = await service.getIcsFeed('student-token');

      expect(mockTimetableEventPrisma.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timetableVersion: { status: 'PUBLISHED' },
            teachingAssignment: {
              OR: [
                { teacherId: 'student-1' },
                { groupId: 'group-101', subgroupId: null },
                {
                  stream: {
                    groups: {
                      some: { id: 'group-101' },
                    },
                  },
                },
                { subgroupId: 'subgroup-1' },
              ],
            },
          },
        }),
      );
      expect(ics).toContain('Software Engineering');
      expect(ics).not.toContain('Other Subgroup Lab');
    });
  });

  describe('subscription token lifecycle', () => {
    it('reuses existing active token if present instead of creating duplicates', async () => {
      const existing = {
        id: 'token-existing',
        userId: 'user-1',
        token: 'existing-base64url-token',
        isActive: true,
      };

      mockCalendarSubscriptionTokenPrisma.findFirst.mockResolvedValue(existing);

      const result = await service.createSubscriptionToken('user-1');

      expect(result).toEqual(existing);
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      expect(mockCalendarSubscriptionTokenPrisma.create).not.toHaveBeenCalled();
    });

    it('creates a new 32-byte base64url token when no active token exists', async () => {
      mockCalendarSubscriptionTokenPrisma.findFirst.mockResolvedValue(null);
      mockCalendarSubscriptionTokenPrisma.create.mockImplementation(
        async ({ data }) => ({
          id: 'token-id-1',
          ...data,
        }),
      );

      const result = await service.createSubscriptionToken('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.isActive).toBe(true);
      expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it('rotates subscription token by deactivating existing tokens and creating a new one', async () => {
      mockCalendarSubscriptionTokenPrisma.updateMany.mockResolvedValue({
        count: 1,
      });
      mockCalendarSubscriptionTokenPrisma.create.mockImplementation(
        async ({ data }) => ({
          id: 'token-rotated',
          ...data,
        }),
      );

      const result = await service.rotateSubscriptionToken('user-1');

      expect(
        mockCalendarSubscriptionTokenPrisma.updateMany,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        data: { isActive: false },
      });
      expect(result.id).toBe('token-rotated');
      expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it('revokes all active tokens for user', async () => {
      mockCalendarSubscriptionTokenPrisma.updateMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.revokeSubscriptionTokens('user-1');

      expect(result).toEqual({ count: 2 });
      expect(
        mockCalendarSubscriptionTokenPrisma.updateMany,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        data: { isActive: false },
      });
    });
  });

  describe('updateMeetingUrl', () => {
    it('throws NotFoundException if assignment does not exist', async () => {
      mockTeachingAssignmentPrisma.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMeetingUrl('missing-id', 'https://meet.com', {
          userId: 'user-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not the teacher and not admin', async () => {
      mockTeachingAssignmentPrisma.findUnique.mockResolvedValue({
        id: 'assign-1',
        teacherId: 'teacher-1',
      });

      await expect(
        service.updateMeetingUrl('assign-1', 'https://meet.com', {
          userId: 'other-user',
          roles: [Role.OPPORTUNITIES_USER],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates meeting URL when user is the assigned teacher', async () => {
      mockTeachingAssignmentPrisma.findUnique.mockResolvedValue({
        id: 'assign-1',
        teacherId: 'teacher-1',
      });
      mockTeachingAssignmentPrisma.update.mockResolvedValue({
        id: 'assign-1',
        meetingUrl: 'https://meet.com/new',
      });

      const updated = await service.updateMeetingUrl(
        'assign-1',
        'https://meet.com/new',
        { userId: 'teacher-1' },
      );

      expect(updated.meetingUrl).toBe('https://meet.com/new');
    });

    it('updates meeting URL when user is admin', async () => {
      mockTeachingAssignmentPrisma.findUnique.mockResolvedValue({
        id: 'assign-1',
        teacherId: 'teacher-1',
      });
      mockTeachingAssignmentPrisma.update.mockResolvedValue({
        id: 'assign-1',
        meetingUrl: 'https://meet.com/admin-set',
      });

      const updated = await service.updateMeetingUrl(
        'assign-1',
        'https://meet.com/admin-set',
        { userId: 'admin-user', roles: [Role.ADMIN] },
      );

      expect(updated.meetingUrl).toBe('https://meet.com/admin-set');
    });
  });
});
