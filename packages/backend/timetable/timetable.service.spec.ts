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
  ImportCurriculumPlanDto,
} from './dto';

describe('TimetableService', () => {
  let service: TimetableService;

  it('archives an assignment idempotently without deleting historical events', async () => {
    mockTeachingAssignmentPrisma.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(
      service.deleteTeachingAssignment('assignment-1'),
    ).resolves.toEqual({ count: 1 });
    await expect(
      service.deleteTeachingAssignment('assignment-1'),
    ).resolves.toEqual({ count: 0 });
    expect(mockTeachingAssignmentPrisma.updateMany).toHaveBeenCalledWith({
      where: { id: 'assignment-1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(mockTimetableEventPrisma.update).not.toHaveBeenCalled();
  });

  it('excludes archived assignments from plan and teacher lists', async () => {
    mockTeachingAssignmentPrisma.findMany.mockResolvedValue([]);
    mockSlotPreferencePrisma.findMany.mockResolvedValue([]);
    mockCurriculumPlanPrisma.findUnique.mockResolvedValue({
      id: 'plan-1',
      teachingAssignments: [],
    });

    await service.listTeachingAssignments('plan-1');
    await service.listTeacherAssignments('teacher-1');
    await service.getCurriculumPlan('plan-1');

    expect(mockTeachingAssignmentPrisma.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { curriculumPlanId: 'plan-1', deletedAt: null },
      }),
    );
    expect(mockTeachingAssignmentPrisma.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teacherId: 'teacher-1', deletedAt: null },
      }),
    );
    expect(mockCurriculumPlanPrisma.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          teachingAssignments: expect.objectContaining({
            where: { deletedAt: null },
          }),
        },
      }),
    );
  });

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
    findMany: jest.fn(),
  };

  const mockTeachingAssignmentPrisma = {
    updateMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const mockSemesterCalendarPrisma = {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };

  const mockSlotPreferencePrisma = {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
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
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const mockCalendarSubscriptionTokenPrisma = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockUserPrisma = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  };

  const mockPrismaTables = {
    $queryRaw: jest.fn(),
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
    teacherSlotPreference: mockSlotPreferencePrisma,
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

  describe('teacher slot preferences', () => {
    it("lists every teacher's preferences of a semester", async () => {
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue({
        id: 'semester-1',
      });
      mockSlotPreferencePrisma.findMany.mockResolvedValue([
        {
          teacherId: 'teacher-2',
          weekday: 1,
          pair: 1,
          preference: 'PREFERRED',
        },
      ]);

      await expect(
        service.listSemesterSlotPreferences('semester-1'),
      ).resolves.toHaveLength(1);
      expect(mockSlotPreferencePrisma.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { semesterCalendarId: 'semester-1' },
        }),
      );
    });

    it('reports a missing semester when listing preferences', async () => {
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue(null);

      await expect(
        service.listSemesterSlotPreferences('missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('replaces only the current teacher semester grid and supports clearing', async () => {
      mockUserPrisma.findFirst.mockResolvedValue({
        id: 'teacher-1',
        roles: [Role.INSTRUCTOR],
      });
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue({
        id: 'semester-1',
      });
      mockSlotPreferencePrisma.findMany.mockResolvedValue([]);

      await service.saveMySlotPreferences('teacher-1', 'semester-1', {
        slots: [],
      });

      expect(mockSlotPreferencePrisma.deleteMany).toHaveBeenCalledWith({
        where: { teacherId: 'teacher-1', semesterCalendarId: 'semester-1' },
      });
      expect(mockSlotPreferencePrisma.createMany).not.toHaveBeenCalled();
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    });

    it('saves non-empty slots atomically for the current teacher and semester', async () => {
      mockUserPrisma.findFirst.mockResolvedValue({
        id: 'teacher-1',
        roles: [Role.INSTRUCTOR],
      });
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue({
        id: 'semester-1',
      });
      const expected = [
        {
          teacherId: 'teacher-1',
          semesterCalendarId: 'semester-1',
          weekday: 2,
          pair: 3,
          preference: 'PREFERRED',
        },
      ];

      mockSlotPreferencePrisma.findMany.mockResolvedValue(expected);

      const saved = await service.saveMySlotPreferences(
        'teacher-1',
        'semester-1',
        {
          slots: [{ weekday: 2, pair: 3, preference: 'PREFERRED' }],
        },
      );

      expect(saved).toEqual(expected);
      expect(mockSlotPreferencePrisma.createMany).toHaveBeenCalledWith({
        data: [
          {
            teacherId: 'teacher-1',
            semesterCalendarId: 'semester-1',
            weekday: 2,
            pair: 3,
            preference: 'PREFERRED',
          },
        ],
      });
    });

    it('rejects a missing semester calendar with NotFoundException', async () => {
      mockUserPrisma.findFirst.mockResolvedValue({
        id: 'teacher-1',
        roles: [Role.INSTRUCTOR],
      });
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue(null);

      await expect(
        service.getMySlotPreferences('teacher-1', 'missing-semester'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lists semesters formatted as ISO date strings for instructors', async () => {
      mockUserPrisma.findFirst.mockResolvedValue({
        id: 'teacher-1',
        roles: [Role.INSTRUCTOR],
      });
      mockSemesterCalendarPrisma.findMany.mockResolvedValue([
        {
          id: 'semester-1',
          academicYear: '2026/2027',
          semester: 1,
          startDate: new Date('2026-09-07T00:00:00.000Z'),
          teachingWeeks: 16,
        },
      ]);

      await expect(
        service.listPreferenceSemesters('teacher-1'),
      ).resolves.toEqual([
        {
          id: 'semester-1',
          academicYear: '2026/2027',
          semester: 1,
          startDate: '2026-09-07',
          teachingWeeks: 16,
        },
      ]);
    });

    it('rejects a non-teacher before reading preferences', async () => {
      mockUserPrisma.findFirst.mockResolvedValue(null);

      await expect(
        service.getMySlotPreferences('student-1', 'semester-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('translates a concurrent replacement conflict instead of leaking Prisma errors', async () => {
      mockUserPrisma.findFirst.mockResolvedValue({ id: 'teacher-1' });
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue({
        id: 'semester-1',
      });
      mockPrismaService.$transaction.mockRejectedValueOnce({ code: 'P2034' });

      await expect(
        service.saveMySlotPreferences('teacher-1', 'semester-1', { slots: [] }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('manual adjustments', () => {
    const assignment = {
      id: 'assignment-1',
      teacherId: 'teacher-1',
      groupId: 'group-1',
      disciplineTitle: 'Calculus',
      teachingType: TeachingType.LECTURE,
      isSaturdayOnly: false,
      hasLateSlotAuthorization: false,
    };
    const event = {
      id: 'event-1',
      timetableVersionId: 'version-1',
      teachingAssignmentId: assignment.id,
      teachingAssignment: assignment,
      date: new Date('2026-09-07'),
      pair: 1,
      pairSpan: 1,
      isCancelled: false,
      stableKey: 'assignment-1:2026-09-07:1',
    };
    const calendar = { id: 'calendar-1', makeupSaturdays: [] };
    const draft = {
      id: 'version-1',
      status: 'DRAFT',
      semesterCalendarId: calendar.id,
      semesterCalendar: calendar,
      events: [event],
    };
    const slot = {
      teachingAssignmentId: assignment.id,
      fromWeekday: 1,
      fromPair: 1,
      toWeekday: 2,
      toPair: 2,
    };
    const reschedule = { newDate: '2026-09-08', newPair: 2 };

    beforeEach(() => {
      mockTeacherUnavailabilityPrisma.findMany.mockResolvedValue([]);
      mockTimetableVersionPrisma.findUnique.mockResolvedValue(draft);
      mockTimetableEventPrisma.findUnique.mockResolvedValue({
        ...event,
        timetableVersion: { ...draft, status: 'PUBLISHED' },
      });
      mockTimetableEventPrisma.update.mockImplementation(
        async ({ data, where }) => ({ ...event, id: where.id, ...data }),
      );
    });

    it('moves every recurrence of the draft slot and returns recalculated penalties', async () => {
      const secondEvent = {
        ...event,
        id: 'event-2',
        date: new Date('2026-09-14'),
      };

      mockTimetableVersionPrisma.findUnique.mockResolvedValue({
        ...draft,
        events: [event, secondEvent],
      });

      const result = await service.adjustDraftSlot(draft.id, slot);

      expect(result.events).toHaveLength(2);
      expect(result.penaltyScore).toEqual(expect.any(Number));
      expect(mockTimetableEventPrisma.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          date: new Date('2026-09-08'),
          pair: 2,
          stableKey: 'assignment-1:2026-09-08:2',
        },
      });
      expect(mockTimetableEventPrisma.update).toHaveBeenCalledWith({
        where: { id: 'event-2' },
        data: {
          date: new Date('2026-09-15'),
          pair: 2,
          stableKey: 'assignment-1:2026-09-15:2',
        },
      });
    });

    it('returns complete scheduled events for moved and unmoved slots with historical snapshots', async () => {
      mockTimetableVersionPrisma.findUnique.mockResolvedValue({
        ...draft,
        generationId: 'generation-1',
        candidateIndex: 2,
        events: [
          {
            ...event,
            disciplineTitleSnapshot: 'Historical calculus',
            teachingTypeSnapshot: TeachingType.PRACTICAL,
            teacherIdSnapshot: 'historical-teacher',
          },
          {
            ...event,
            id: 'persisted-lab',
            teachingAssignmentId: 'assignment-2',
            pair: 3,
            teachingAssignment: {
              ...assignment,
              id: 'assignment-2',
              disciplineTitle: 'Physics',
              teachingType: TeachingType.LABORATORY,
              groupId: null,
              subgroupId: 'subgroup-1',
              subgroup: { academicGroupId: 'group-2' },
              streamId: 'stream-1',
              stream: { groups: [{ id: 'group-3' }] },
            },
          },
        ],
      });

      const result = await service.adjustDraftSlot(draft.id, slot);

      expect(result).toMatchObject({
        id: 'version-1',
        status: 'DRAFT',
        generationId: 'generation-1',
        candidateIndex: 2,
        penaltyScore: expect.any(Number),
        events: [
          {
            id: 'event-1',
            teachingAssignmentId: 'assignment-1',
            disciplineTitle: 'Historical calculus',
            teachingType: 'PRACTICAL',
            teacherId: 'historical-teacher',
            groupIds: ['group-1'],
            date: '2026-09-08',
            pair: 2,
            pairSpan: 1,
          },
          {
            id: 'persisted-lab',
            teachingAssignmentId: 'assignment-2',
            disciplineTitle: 'Physics',
            teachingType: 'LABORATORY',
            teacherId: 'teacher-1',
            groupIds: ['group-2', 'group-3'],
            subgroupId: 'subgroup-1',
            streamId: 'stream-1',
            date: '2026-09-07',
            pair: 3,
          },
        ],
      });
      expect(result.events[0]).not.toHaveProperty('teachingAssignment');
      expect(mockTimetableEventPrisma.update).toHaveBeenCalledTimes(1);
    });

    it.each(['student', 'teacher'])(
      'rejects draft %s collisions without writing',
      async (collision) => {
        const other = {
          ...event,
          id: 'other',
          teachingAssignmentId: 'other-assignment',
          date: new Date('2026-09-08'),
          pair: 2,
          teachingAssignment: {
            ...assignment,
            teacherId:
              collision === 'teacher' ? assignment.teacherId : 'other-teacher',
            groupId:
              collision === 'student' ? assignment.groupId : 'other-group',
          },
        };

        mockTimetableVersionPrisma.findUnique.mockResolvedValue({
          ...draft,
          events: [event, other],
        });

        await expect(service.adjustDraftSlot(draft.id, slot)).rejects.toThrow(
          ConflictException,
        );
        expect(mockTimetableEventPrisma.update).not.toHaveBeenCalled();
      },
    );

    it('rejects missing versions and missing slots', async () => {
      mockTimetableVersionPrisma.findUnique.mockResolvedValueOnce(null);
      await expect(service.adjustDraftSlot('missing', slot)).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        service.adjustDraftSlot(draft.id, { ...slot, fromPair: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects published draft adjustments', async () => {
      mockTimetableVersionPrisma.findUnique.mockResolvedValue({
        ...draft,
        status: 'PUBLISHED',
      });
      await expect(service.adjustDraftSlot(draft.id, slot)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects confirmed teacher unavailability during draft adjustment', async () => {
      mockTeacherUnavailabilityPrisma.findMany.mockResolvedValue([
        {
          teacherId: assignment.teacherId,
          date: new Date(reschedule.newDate),
          pair: 2,
          isConfirmed: true,
        },
      ]);
      await expect(service.adjustDraftSlot(draft.id, slot)).rejects.toThrow(
        ConflictException,
      );
      expect(mockTimetableEventPrisma.update).not.toHaveBeenCalled();
    });

    it('rejects Saturday-only events moved to weekdays in draft adjustment', async () => {
      const saturdayEvent = {
        ...event,
        date: new Date('2026-09-12'),
        teachingAssignment: { ...assignment, isSaturdayOnly: true },
      };

      mockTimetableVersionPrisma.findUnique.mockResolvedValue({
        ...draft,
        events: [saturdayEvent],
      });
      await expect(
        service.adjustDraftSlot(draft.id, { ...slot, fromWeekday: 6 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects weekday events on an unapproved Saturday in draft adjustment', async () => {
      await expect(
        service.adjustDraftSlot(draft.id, { ...slot, toWeekday: 6 }),
      ).rejects.toThrow(ConflictException);
    });
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

    describe('importCurriculumPlan', () => {
      const importDto: ImportCurriculumPlanDto = {
        faculty: ' ННІ КН та ШІ ',
        title: 'КН, 2 курс',
        academicYear: '2026/2027',
        semester: 1,
        groupId: 'group-1',
        assignments: [
          {
            disciplineTitle: ' Бази даних ',
            teachingType: TeachingType.LECTURE,
            academicHours: 32,
          },
          {
            disciplineTitle: 'Бази даних',
            teachingType: TeachingType.LABORATORY,
            academicHours: 16,
          },
        ],
      };

      it('creates the plan and its assignments in one transaction', async () => {
        mockCurriculumPlanPrisma.create.mockResolvedValue({ id: 'plan-9' });
        mockTeachingAssignmentPrisma.createMany.mockResolvedValue({ count: 2 });

        await expect(service.importCurriculumPlan(importDto)).resolves.toEqual({
          id: 'plan-9',
        });
        expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
        expect(mockCurriculumPlanPrisma.create).toHaveBeenCalledWith({
          data: {
            faculty: 'ННІ КН та ШІ',
            title: 'КН, 2 курс',
            academicYear: '2026/2027',
            semester: 1,
            isDraft: true,
          },
        });
        expect(mockTeachingAssignmentPrisma.createMany).toHaveBeenCalledWith({
          data: [
            {
              curriculumPlanId: 'plan-9',
              disciplineTitle: 'Бази даних',
              teachingType: TeachingType.LECTURE,
              academicHours: 32,
              groupId: 'group-1',
              streamId: undefined,
            },
            {
              curriculumPlanId: 'plan-9',
              disciplineTitle: 'Бази даних',
              teachingType: TeachingType.LABORATORY,
              academicHours: 16,
              groupId: 'group-1',
              streamId: undefined,
            },
          ],
        });
      });

      it('creates an empty plan without a target group', async () => {
        mockCurriculumPlanPrisma.create.mockResolvedValue({ id: 'plan-10' });

        await service.importCurriculumPlan({
          ...importDto,
          groupId: undefined,
          assignments: [],
        });

        expect(mockTeachingAssignmentPrisma.createMany).not.toHaveBeenCalled();
      });

      it('rejects assignments without a group or stream', async () => {
        await expect(
          service.importCurriculumPlan({ ...importDto, groupId: undefined }),
        ).rejects.toThrow(BadRequestException);
        expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      });

      it('rejects an ambiguous group and stream target before writing', async () => {
        await expect(
          service.importCurriculumPlan({ ...importDto, streamId: 'stream-1' }),
        ).rejects.toThrow(BadRequestException);
        expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      });

      it('reports an unknown group as a bad request', async () => {
        mockCurriculumPlanPrisma.create.mockResolvedValue({ id: 'plan-11' });
        mockTeachingAssignmentPrisma.createMany.mockRejectedValue({
          code: 'P2003',
        });

        await expect(service.importCurriculumPlan(importDto)).rejects.toThrow(
          'Group or stream does not exist',
        );
      });
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
            where: { deletedAt: null },
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

    it.each([
      ['curriculum plan', 'TeachingAssignment_curriculumPlanId_fkey'],
      ['teacher', 'TeachingAssignment_teacherId_fkey'],
    ])(
      'translates a missing %s foreign key into BadRequestException without leaking Prisma text',
      async (_label, constraint) => {
        mockTeachingAssignmentPrisma.create.mockRejectedValue({
          code: 'P2003',
          message: `Foreign key constraint violated on the constraint: \`${constraint}\``,
        });

        const dto: CreateTeachingAssignmentDto = {
          curriculumPlanId: 'missing-plan',
          disciplineTitle: 'Calculus',
          teachingType: TeachingType.LECTURE,
          academicHours: 32,
          teacherId: 'missing-teacher',
          groupId: 'group-1',
        };

        const error = await service
          .createTeachingAssignment(dto)
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).message).not.toMatch(
          /Foreign key|Prisma|_fkey/,
        );
      },
    );

    it('translates a missing foreign key on update into BadRequestException', async () => {
      mockTeachingAssignmentPrisma.findUnique.mockResolvedValue({
        id: 'assign-1',
        groupId: 'group-1',
        subgroupId: null,
        streamId: null,
      });
      mockTeachingAssignmentPrisma.update.mockRejectedValue({ code: 'P2003' });

      await expect(
        service.updateTeachingAssignment('assign-1', { teacherId: 'missing' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a teaching assignment without a teacher', async () => {
      mockTeachingAssignmentPrisma.create.mockResolvedValue({
        id: 'assign-1',
        teacherId: null,
      });

      await service.createTeachingAssignment({
        curriculumPlanId: 'plan-1',
        disciplineTitle: 'Calculus',
        teachingType: TeachingType.LECTURE,
        academicHours: 32,
        streamId: 'stream-1',
      });

      expect(mockTeachingAssignmentPrisma.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ teacherId: undefined }),
        }),
      );
    });

    it('lists teachers as safe id and name pairs for users with the instructor role', async () => {
      const teachers = [
        { id: 't-1', name: 'Prof Smith', roles: [Role.INSTRUCTOR] },
      ];

      mockUserPrisma.findMany.mockResolvedValue(teachers);

      const result = await service.listTeachers();

      expect(result).toEqual(teachers);
      expect(mockUserPrisma.findMany).toHaveBeenCalledWith({
        where: { roles: { has: Role.INSTRUCTOR } },
        select: { id: true, name: true, roles: true },
        orderBy: { name: 'asc' },
      });
    });

    it('lists curriculum plans that are not archived', async () => {
      const plans = [
        { id: 'plan-1', title: 'CS', academicYear: '2026/2027', semester: 1 },
      ];

      mockCurriculumPlanPrisma.findMany.mockResolvedValue(plans);

      const result = await service.listCurriculumPlans();

      expect(result).toEqual(plans);
      expect(mockCurriculumPlanPrisma.findMany).toHaveBeenCalledWith({
        where: { isArchived: false },
        orderBy: [
          { academicYear: 'desc' },
          { semester: 'desc' },
          { title: 'asc' },
        ],
      });
    });

    it('updates an existing teaching assignment and clears mutually exclusive target fields', async () => {
      mockTeachingAssignmentPrisma.findUnique.mockResolvedValue({
        id: 'assign-1',
        curriculumPlanId: 'plan-1',
        disciplineTitle: 'Calculus',
        teachingType: TeachingType.LECTURE,
        academicHours: 32,
        teacherId: 'teacher-1',
        groupId: 'group-1',
        subgroupId: null,
        streamId: null,
      });
      mockTeachingAssignmentPrisma.update.mockResolvedValue({
        id: 'assign-1',
        curriculumPlanId: 'plan-1',
        disciplineTitle: 'Advanced Calculus',
        teachingType: TeachingType.LECTURE,
        academicHours: 48,
        teacherId: 'teacher-2',
        groupId: null,
        subgroupId: null,
        streamId: 'stream-1',
      });

      const result = await service.updateTeachingAssignment('assign-1', {
        disciplineTitle: 'Advanced Calculus',
        academicHours: 48,
        teacherId: 'teacher-2',
        streamId: 'stream-1',
      });

      expect(result.academicHours).toBe(48);
      expect(mockTeachingAssignmentPrisma.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'assign-1' },
          data: expect.objectContaining({
            disciplineTitle: 'Advanced Calculus',
            academicHours: 48,
            teacherId: 'teacher-2',
            streamId: 'stream-1',
            groupId: null,
            subgroupId: null,
          }),
        }),
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
        where: { curriculumPlanId: 'plan-1', deletedAt: null },
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
        where: { teacherId: 'teacher-1', deletedAt: null },
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

    it('refuses shortening the calendar past a published occurrence', async () => {
      mockSemesterCalendarPrisma.findUnique.mockResolvedValue({ id: 'cal-1' });
      mockTimetableEventPrisma.findMany.mockResolvedValue([
        { date: new Date('2026-12-21') },
      ]);

      await expect(
        service.configureSemesterCalendar({
          academicYear: '2026/2027',
          semester: 1,
          startDate: '2026-09-07',
          teachingWeeks: 14,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses removing a makeup Saturday used by a published class', async () => {
      const dto: CreateSemesterCalendarDto = {
        academicYear: '2026/2027',
        semester: 1,
        startDate: '2026-09-07',
        teachingWeeks: 16,
        makeupSaturdays: [],
      };

      mockSemesterCalendarPrisma.findUnique.mockResolvedValue({ id: 'cal-1' });
      mockTimetableEventPrisma.findMany.mockResolvedValue([
        {
          date: new Date('2026-09-12'),
          teachingAssignment: { isSaturdayOnly: false },
        },
      ]);

      await expect(service.configureSemesterCalendar(dto)).rejects.toThrow(
        ConflictException,
      );

      mockSemesterCalendarPrisma.upsert.mockResolvedValue({ id: 'cal-1' });

      await expect(
        service.configureSemesterCalendar({
          ...dto,
          makeupSaturdays: [{ date: '2026-09-12', followsWeekday: 1 }],
        }),
      ).resolves.toEqual({ id: 'cal-1' });
    });

    it('rejects makeup Saturdays outside the configured teaching weeks', async () => {
      await expect(
        service.configureSemesterCalendar({
          academicYear: '2026/2027',
          semester: 1,
          startDate: '2026-09-07',
          teachingWeeks: 14,
          makeupSaturdays: [{ date: '2026-12-19', followsWeekday: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
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
      expect(mockTeachingAssignmentPrisma.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { curriculumPlanId: 'plan-1', deletedAt: null },
        }),
      );
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
      expect(mockTeachingAssignmentPrisma.findMany).toHaveBeenCalledWith({
        where: { curriculumPlanId: { in: ['plan-1'] }, deletedAt: null },
      });
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

    it('detects published conflicts across different semester calendars on overlapping dates', async () => {
      const version = {
        id: 'ver-cal-b',
        status: 'DRAFT',
        semesterCalendarId: 'cal-b',
        semesterCalendar: { id: 'cal-b', makeupSaturdays: [] },
        events: [
          {
            id: 'evt-b',
            teachingAssignmentId: 'assign-b',
            date: new Date('2026-09-07'),
            pair: 1,
            pairSpan: 1,
            isCancelled: false,
            disciplineTitleSnapshot: 'Math',
            teachingTypeSnapshot: TeachingType.LECTURE,
            teacherIdSnapshot: 'teacher-shared',
            teachingAssignment: {
              id: 'assign-b',
              curriculumPlanId: 'plan-b',
              academicHours: 2,
              groupId: 'group-b',
            },
          },
        ],
      };

      mockTimetableVersionPrisma.findUnique.mockResolvedValue(version);
      mockTeachingAssignmentPrisma.findMany.mockResolvedValue([
        { id: 'assign-b', curriculumPlanId: 'plan-b', academicHours: 2 },
      ]);
      mockTeacherUnavailabilityPrisma.findMany.mockResolvedValue([]);
      mockTimetableEventPrisma.findMany.mockResolvedValue([
        {
          id: 'evt-cal-a',
          teachingAssignmentId: 'assign-a',
          date: new Date('2026-09-07'),
          pair: 1,
          pairSpan: 1,
          isCancelled: false,
          disciplineTitleSnapshot: 'Physics',
          teachingTypeSnapshot: TeachingType.LECTURE,
          teacherIdSnapshot: 'teacher-shared',
          timetableVersion: {
            semesterCalendar: { id: 'cal-a', makeupSaturdays: [] },
          },
          teachingAssignment: {
            id: 'assign-a',
            curriculumPlanId: 'plan-a',
            groupId: 'group-a',
          },
        },
      ]);

      await expect(
        service.publishTimetableVersion('ver-cal-b', 'admin-1'),
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

  describe('personal schedule event identity', () => {
    it('returns the database event ID rather than the calendar subscription key', async () => {
      mockUserPrisma.findUnique.mockResolvedValue({ id: 'teacher-1' });
      mockTimetableEventPrisma.findMany.mockResolvedValue([
        {
          id: '8ec5db6a-98ae-4f88-a7d8-bd645e53404d',
          stableKey: 'assignment-1:2026-09-07:1',
          teachingAssignmentId: 'assignment-1',
          date: new Date('2026-09-08'),
          pair: 2,
          pairSpan: 1,
          isCancelled: false,
          disciplineTitleSnapshot: 'Calculus',
          teachingTypeSnapshot: 'LECTURE',
          teachingAssignment: { teacherId: 'teacher-1' },
        },
      ]);

      const events = await service.getMyScheduleEvents('teacher-1');

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('8ec5db6a-98ae-4f88-a7d8-bd645e53404d');
      expect(events[0].date).toBe('2026-09-08');
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
