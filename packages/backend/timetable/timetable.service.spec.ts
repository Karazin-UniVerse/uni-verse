import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, TeachingType } from '@universe/database';
import { PrismaService } from '../prisma/prisma.service';
import { TimetableService } from './timetable.service';
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
    update: jest.fn(),
  };

  const mockTimetableEventPrisma = {
    findMany: jest.fn(),
  };

  const mockCalendarSubscriptionTokenPrisma = {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const mockUserPrisma = {
    findFirst: jest.fn(),
  };

  const mockPrismaService = {
    academicGroup: mockAcademicGroupPrisma,
    curriculumPlan: mockCurriculumPlanPrisma,
    teachingAssignment: mockTeachingAssignmentPrisma,
    semesterCalendar: mockSemesterCalendarPrisma,
    teacherUnavailability: mockTeacherUnavailabilityPrisma,
    timetableVersion: mockTimetableVersionPrisma,
    timetableEvent: mockTimetableEventPrisma,
    calendarSubscriptionToken: mockCalendarSubscriptionTokenPrisma,
    user: mockUserPrisma,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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

      expect(mockTeachingAssignmentPrisma.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            teacher: {
              select: {
                id: true,
                name: true,
                roles: true,
              },
            },
          }),
        }),
      );

      const returnedTeacher = result[0].teacher as Record<string, unknown>;

      expect(returnedTeacher.password).toBeUndefined();
      expect(returnedTeacher.token).toBeUndefined();
      expect(returnedTeacher.refreshToken).toBeUndefined();
      expect(returnedTeacher.id).toBe('teacher-1');
      expect(returnedTeacher.name).toBe('Prof Smith');
      expect(returnedTeacher.roles).toEqual([Role.INSTRUCTOR]);
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
      expect(mockSemesterCalendarPrisma.upsert).toHaveBeenCalledWith({
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
          excludedDates: dto.excludedDates,
          makeupSaturdays: [],
        },
        update: {
          startDate: new Date(dto.startDate),
          teachingWeeks: dto.teachingWeeks,
          excludedDates: dto.excludedDates,
          makeupSaturdays: [],
        },
      });
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
      expect(mockTeacherUnavailabilityPrisma.upsert).toHaveBeenCalled();
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
      expect(mockTeacherUnavailabilityPrisma.upsert).toHaveBeenCalledWith({
        where: {
          teacherId_date_pair: {
            teacherId: 'authorized-teacher-1',
            date: dateObj,
            pair: 2,
          },
        },
        create: {
          teacherId: 'authorized-teacher-1',
          date: dateObj,
          pair: 2,
          reason: 'Conference',
          isConfirmed: false,
        },
        update: {
          reason: 'Conference',
          isConfirmed: false,
        },
      });
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
      expect(mockTeacherUnavailabilityPrisma.update).toHaveBeenCalledWith({
        where: { id: 'unavail-1' },
        data: { isConfirmed: true },
      });
    });

    it('throws NotFoundException when confirming nonexistent unavailability', async () => {
      mockTeacherUnavailabilityPrisma.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmTeacherUnavailability('unavail-999', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateTimetableDraft', () => {
    it('generates candidates and creates TimetableVersion with event snapshots', async () => {
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
      mockUserPrisma.findFirst.mockResolvedValue({ id: 'admin-1' });

      const createdVersion = {
        id: 'ver-1',
        status: 'DRAFT',
        semesterCalendarId: 'cal-1',
        events: [{ id: 'evt-1' }],
      };

      mockTimetableVersionPrisma.create.mockResolvedValue(createdVersion);

      const result = await service.generateTimetableDraft('plan-1', {
        userId: 'admin-1',
      });

      expect(result.versionId).toBe('ver-1');
      expect(result.candidates.length).toBeGreaterThanOrEqual(1);
      expect(mockTimetableVersionPrisma.create).toHaveBeenCalled();
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
      // Academic hours not divisible by pair hours (e.g. 5) causes INVALID_INPUT
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

    it('validates conflicts and updates status to PUBLISHED', async () => {
      const version = {
        id: 'ver-1',
        status: 'DRAFT',
        events: [
          {
            id: 'evt-1',
            teachingAssignmentId: 'assign-1',
            date: new Date('2026-09-07'),
            pair: 1,
            pairSpan: 1,
            disciplineTitleSnapshot: 'Calculus',
            teachingTypeSnapshot: TeachingType.LECTURE,
            teacherIdSnapshot: 'teacher-1',
            teachingAssignment: {
              groupId: 'group-1',
              stream: null,
            },
          },
        ],
      };

      mockTimetableVersionPrisma.findUnique.mockResolvedValue(version);
      mockTeacherUnavailabilityPrisma.findMany.mockResolvedValue([]);
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
      expect(mockTimetableVersionPrisma.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'ver-1' }),
          data: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });

    it('throws ConflictException when hard conflicts are detected', async () => {
      // Overlapping events for the same teacher at the same date and pair
      const version = {
        id: 'ver-1',
        status: 'DRAFT',
        events: [
          {
            id: 'evt-1',
            teachingAssignmentId: 'assign-1',
            date: new Date('2026-09-07'),
            pair: 1,
            disciplineTitleSnapshot: 'Calculus',
            teachingTypeSnapshot: TeachingType.LECTURE,
            teacherIdSnapshot: 'teacher-1',
            teachingAssignment: { groupId: 'group-1' },
          },
          {
            id: 'evt-2',
            teachingAssignmentId: 'assign-2',
            date: new Date('2026-09-07'),
            pair: 1,
            disciplineTitleSnapshot: 'Physics',
            teachingTypeSnapshot: TeachingType.LECTURE,
            teacherIdSnapshot: 'teacher-1', // same teacher, same time, different assignment
            teachingAssignment: { groupId: 'group-2' },
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

    it('generates valid ICS calendar for authenticated teacher', async () => {
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

      const events = [
        {
          id: 'evt-1',
          date: new Date('2026-09-07'),
          pair: 1,
          isCancelled: false,
          disciplineTitleSnapshot: 'Calculus',
          teachingTypeSnapshot: TeachingType.LECTURE,
          meetingUrlOverride: 'https://meet.google.com/test',
          teachingAssignment: {
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

      expect(typeof ics).toBe('string');
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('Calculus');
      expect(ics).toContain('END:VCALENDAR');
      expect(mockCalendarSubscriptionTokenPrisma.update).toHaveBeenCalledWith({
        where: { id: 'sub-token-1' },
        data: { lastAccessedAt: expect.any(Date) },
      });
      expect(mockTimetableEventPrisma.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timetableVersion: { status: 'PUBLISHED' },
            teachingAssignment: {
              OR: [{ teacherId: 'teacher-1' }],
            },
          },
        }),
      );
    });

    it('generates ICS calendar for student matching academicGroupId', async () => {
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
          academicSubgroupId: null,
        },
      };

      mockCalendarSubscriptionTokenPrisma.findUnique.mockResolvedValue(
        tokenRecord,
      );
      mockCalendarSubscriptionTokenPrisma.update.mockResolvedValue({});

      const groupEvents = [
        {
          id: 'evt-group',
          date: new Date('2026-09-08'),
          pair: 2,
          isCancelled: false,
          disciplineTitleSnapshot: 'Software Engineering',
          teachingTypeSnapshot: TeachingType.LECTURE,
          meetingUrlOverride: null,
          teachingAssignment: {
            disciplineTitle: 'Software Engineering',
            teachingType: TeachingType.LECTURE,
            groupId: 'group-101',
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
              ],
            },
          },
        }),
      );
      expect(ics).toContain('Software Engineering');
      expect(ics).toContain('CS-201');
      expect(ics).toContain('Dr. Jones');
    });

    it('generates ICS calendar for student matching academicSubgroupId', async () => {
      const tokenRecord = {
        id: 'sub-token-subgroup',
        token: 'subgroup-token',
        isActive: true,
        userId: 'student-2',
        user: {
          id: 'student-2',
          roles: [Role.OPPORTUNITIES_USER],
          name: 'Alice Student',
          academicGroupId: 'group-101',
          academicSubgroupId: 'subgroup-1',
        },
      };

      mockCalendarSubscriptionTokenPrisma.findUnique.mockResolvedValue(
        tokenRecord,
      );
      mockCalendarSubscriptionTokenPrisma.update.mockResolvedValue({});

      const subgroupEvents = [
        {
          id: 'evt-subgroup',
          date: new Date('2026-09-09'),
          pair: 3,
          isCancelled: false,
          disciplineTitleSnapshot: 'Lab 1',
          teachingTypeSnapshot: TeachingType.LABORATORY,
          meetingUrlOverride: null,
          teachingAssignment: {
            disciplineTitle: 'Lab 1',
            teachingType: TeachingType.LABORATORY,
            groupId: 'group-101',
            subgroupId: 'subgroup-1',
            group: { code: 'CS-201' },
            teacher: { name: 'Prof Brown' },
            stream: null,
          },
        },
      ];

      mockTimetableEventPrisma.findMany.mockResolvedValue(subgroupEvents);

      const ics = await service.getIcsFeed('subgroup-token');

      expect(mockTimetableEventPrisma.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timetableVersion: { status: 'PUBLISHED' },
            teachingAssignment: {
              OR: [
                { teacherId: 'student-2' },
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
      expect(ics).toContain('Lab 1');
    });

    it('generates ICS calendar for student matching academicStream containing their group', async () => {
      const tokenRecord = {
        id: 'sub-token-stream',
        token: 'stream-token',
        isActive: true,
        userId: 'student-3',
        user: {
          id: 'student-3',
          roles: [Role.OPPORTUNITIES_USER],
          name: 'Bob Student',
          academicGroupId: 'group-101',
          academicSubgroupId: null,
        },
      };

      mockCalendarSubscriptionTokenPrisma.findUnique.mockResolvedValue(
        tokenRecord,
      );
      mockCalendarSubscriptionTokenPrisma.update.mockResolvedValue({});

      const streamEvents = [
        {
          id: 'evt-stream',
          date: new Date('2026-09-10'),
          pair: 1,
          isCancelled: false,
          disciplineTitleSnapshot: 'General Physics Lecture',
          teachingTypeSnapshot: TeachingType.LECTURE,
          meetingUrlOverride: null,
          teachingAssignment: {
            disciplineTitle: 'General Physics Lecture',
            teachingType: TeachingType.LECTURE,
            streamId: 'stream-1',
            stream: {
              groups: [{ code: 'CS-101' }, { code: 'CS-102' }],
            },
            teacher: { name: 'Prof Einstein' },
          },
        },
      ];

      mockTimetableEventPrisma.findMany.mockResolvedValue(streamEvents);

      const ics = await service.getIcsFeed('stream-token');

      expect(mockTimetableEventPrisma.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timetableVersion: { status: 'PUBLISHED' },
            teachingAssignment: {
              OR: [
                { teacherId: 'student-3' },
                { groupId: 'group-101', subgroupId: null },
                {
                  stream: {
                    groups: {
                      some: { id: 'group-101' },
                    },
                  },
                },
              ],
            },
          },
        }),
      );
      expect(ics).toContain('General Physics Lecture');
      expect(ics).toContain('CS-101');
      expect(ics).toContain('CS-102');
      expect(ics).toContain('Prof Einstein');
    });
  });

  describe('createSubscriptionToken', () => {
    it('creates a new active calendar subscription token', async () => {
      const created = {
        id: 'token-id-1',
        userId: 'user-1',
        token: 'uuid-token',
        isActive: true,
      };

      mockCalendarSubscriptionTokenPrisma.create.mockResolvedValue(created);

      const result = await service.createSubscriptionToken('user-1');

      expect(result).toEqual(created);
      expect(mockCalendarSubscriptionTokenPrisma.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          token: expect.any(String),
          isActive: true,
        },
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
      expect(mockTeachingAssignmentPrisma.update).toHaveBeenCalledWith({
        where: { id: 'assign-1' },
        data: { meetingUrl: 'https://meet.com/new' },
      });
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
