import {
  BadRequestException,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, TeachingType } from '@universe/database';
import {
  ParseFeedTokenPipe,
  TimetableController,
} from './timetable.controller';
import { TimetableService } from './timetable.service';
import type {
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

describe('TimetableController', () => {
  let controller: TimetableController;

  it('allows only admins to archive teaching assignments', async () => {
    mockTimetableService.deleteTeachingAssignment.mockResolvedValue({
      count: 1,
    });
    await expect(
      controller.deleteTeachingAssignment('assignment-1', [Role.ADMIN]),
    ).resolves.toEqual({ count: 1 });
    expect(mockTimetableService.deleteTeachingAssignment).toHaveBeenCalledWith(
      'assignment-1',
    );
    mockTimetableService.deleteTeachingAssignment.mockClear();

    for (const roles of [
      [Role.INSTRUCTOR],
      [Role.OPPORTUNITIES_USER],
      undefined,
    ]) {
      await expect(
        controller.deleteTeachingAssignment('assignment-1', roles),
      ).rejects.toThrow(ForbiddenException);
    }

    expect(
      mockTimetableService.deleteTeachingAssignment,
    ).not.toHaveBeenCalled();
  });

  const mockTimetableService = {
    createAcademicGroup: jest.fn(),
    deleteTeachingAssignment: jest.fn(),
    listAcademicGroups: jest.fn(),
    createCurriculumPlan: jest.fn(),
    getCurriculumPlan: jest.fn(),
    listCurriculumPlans: jest.fn(),
    listTeachers: jest.fn(),
    createTeachingAssignment: jest.fn(),
    updateTeachingAssignment: jest.fn(),
    listTeachingAssignments: jest.fn(),
    listTeacherAssignments: jest.fn(),
    updateMeetingUrl: jest.fn(),
    configureSemesterCalendar: jest.fn(),
    getSemesterCalendar: jest.fn(),
    requestTeacherUnavailability: jest.fn(),
    confirmTeacherUnavailability: jest.fn(),
    generateTimetableDraft: jest.fn(),
    publishTimetableVersion: jest.fn(),
    adjustDraftSlot: jest.fn(),
    createSubscriptionToken: jest.fn(),
    rotateSubscriptionToken: jest.fn(),
    revokeSubscriptionTokens: jest.fn(),
    getIcsFeed: jest.fn(),
    listPreferenceSemesters: jest.fn(),
    getMySlotPreferences: jest.fn(),
    saveMySlotPreferences: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimetableController],
      providers: [
        {
          provide: TimetableService,
          useValue: mockTimetableService,
        },
      ],
    }).compile();

    controller = module.get<TimetableController>(TimetableController);
  });

  describe('manual adjustments', () => {
    const slot = {
      teachingAssignmentId: 'assignment-1',
      fromWeekday: 1,
      fromPair: 1,
      toWeekday: 2,
      toPair: 2,
    };

    it('allows admins to adjust draft slots', async () => {
      mockTimetableService.adjustDraftSlot.mockResolvedValue({ events: [] });
      await expect(
        controller.adjustDraftSlot('version-1', slot, [Role.ADMIN]),
      ).resolves.toEqual({ events: [] });
      expect(mockTimetableService.adjustDraftSlot).toHaveBeenCalledWith(
        'version-1',
        slot,
      );
    });

    it.each([Role.INSTRUCTOR, Role.OPPORTUNITIES_USER, undefined])(
      'rejects non-admin roles %s',
      async (roles) => {
        await expect(
          controller.adjustDraftSlot(
            'version-1',
            slot,
            roles ? [roles] : undefined,
          ),
        ).rejects.toThrow(ForbiddenException);
        expect(mockTimetableService.adjustDraftSlot).not.toHaveBeenCalled();
      },
    );
  });

  describe('slot preferences', () => {
    it('delegates listPreferenceSemesters to service with userId', async () => {
      mockTimetableService.listPreferenceSemesters.mockResolvedValue([]);
      await expect(
        controller.listPreferenceSemesters('teacher-1'),
      ).resolves.toEqual([]);
      expect(mockTimetableService.listPreferenceSemesters).toHaveBeenCalledWith(
        'teacher-1',
      );
    });

    it('delegates getMySlotPreferences to service with userId and semesterId', async () => {
      mockTimetableService.getMySlotPreferences.mockResolvedValue([]);
      await expect(
        controller.getMySlotPreferences('teacher-1', 'semester-1'),
      ).resolves.toEqual([]);
      expect(mockTimetableService.getMySlotPreferences).toHaveBeenCalledWith(
        'teacher-1',
        'semester-1',
      );
    });

    it('delegates saveMySlotPreferences to service with userId, semesterId and dto', async () => {
      const dto = {
        slots: [{ weekday: 1, pair: 1, preference: 'PREFERRED' as const }],
      };

      mockTimetableService.saveMySlotPreferences.mockResolvedValue(dto.slots);
      await expect(
        controller.saveMySlotPreferences('teacher-1', 'semester-1', dto),
      ).resolves.toEqual(dto.slots);
      expect(mockTimetableService.saveMySlotPreferences).toHaveBeenCalledWith(
        'teacher-1',
        'semester-1',
        dto,
      );
    });
  });

  describe('academic groups', () => {
    const dto: CreateAcademicGroupDto = {
      code: 'CS-101',
      degreeLevel: 'BACHELOR',
      studyForm: 'FULL_TIME',
      entryYear: 2026,
      academicYear: '2026/2027',
    };

    it('creates academic group for admin', async () => {
      mockTimetableService.createAcademicGroup.mockResolvedValue({
        id: 'group-1',
        ...dto,
      });

      const result = await controller.createAcademicGroup(dto, [Role.ADMIN]);

      expect(result).toEqual({ id: 'group-1', ...dto });
      expect(mockTimetableService.createAcademicGroup).toHaveBeenCalledWith(
        dto,
      );
    });

    it('rejects createAcademicGroup for non-admin', async () => {
      await expect(
        controller.createAcademicGroup(dto, [Role.OPPORTUNITIES_USER]),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTimetableService.createAcademicGroup).not.toHaveBeenCalled();
    });

    it('lists academic groups', async () => {
      mockTimetableService.listAcademicGroups.mockResolvedValue([]);

      const result = await controller.listAcademicGroups();

      expect(result).toEqual([]);
      expect(mockTimetableService.listAcademicGroups).toHaveBeenCalled();
    });
  });

  describe('curriculum plans', () => {
    const dto: CreateCurriculumPlanDto = {
      faculty: 'CS',
      title: 'CS 2026/2027 S1',
      academicYear: '2026/2027',
      semester: 1,
    };

    it('creates curriculum plan for admin', async () => {
      mockTimetableService.createCurriculumPlan.mockResolvedValue({
        id: 'plan-1',
        ...dto,
      });

      const result = await controller.createCurriculumPlan(dto, [Role.ADMIN]);

      expect(result).toEqual({ id: 'plan-1', ...dto });
      expect(mockTimetableService.createCurriculumPlan).toHaveBeenCalledWith(
        dto,
      );
    });

    it('rejects createCurriculumPlan for non-admin', async () => {
      await expect(
        controller.createCurriculumPlan(dto, [Role.INSTRUCTOR]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('gets curriculum plan by id for admin', async () => {
      mockTimetableService.getCurriculumPlan.mockResolvedValue({
        id: 'plan-1',
      });

      const result = await controller.getCurriculumPlan('plan-1', [Role.ADMIN]);

      expect(result).toEqual({ id: 'plan-1' });
      expect(mockTimetableService.getCurriculumPlan).toHaveBeenCalledWith(
        'plan-1',
      );
    });

    it('lists curriculum plans and teachers for admin only', async () => {
      mockTimetableService.listCurriculumPlans.mockResolvedValue([{ id: 'p' }]);
      mockTimetableService.listTeachers.mockResolvedValue([{ id: 't' }]);

      await expect(
        controller.listCurriculumPlans([Role.ADMIN]),
      ).resolves.toEqual([{ id: 'p' }]);
      await expect(controller.listTeachers([Role.ADMIN])).resolves.toEqual([
        { id: 't' },
      ]);
      await expect(
        controller.listCurriculumPlans([Role.INSTRUCTOR]),
      ).rejects.toThrow(ForbiddenException);
      await expect(controller.listTeachers([Role.INSTRUCTOR])).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects getCurriculumPlan for non-admin', async () => {
      await expect(
        controller.getCurriculumPlan('plan-1', [Role.INSTRUCTOR]),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTimetableService.getCurriculumPlan).not.toHaveBeenCalled();
    });
  });

  describe('teaching assignments', () => {
    const dto: CreateTeachingAssignmentDto = {
      curriculumPlanId: 'plan-1',
      disciplineTitle: 'Calculus',
      teachingType: TeachingType.LECTURE,
      academicHours: 32,
      teacherId: 'teacher-1',
      groupId: 'group-1',
    };

    it('creates teaching assignment for admin', async () => {
      mockTimetableService.createTeachingAssignment.mockResolvedValue({
        id: 'assign-1',
        ...dto,
      });

      const result = await controller.createTeachingAssignment(dto, [
        Role.ADMIN,
      ]);

      expect(result).toEqual({ id: 'assign-1', ...dto });
      expect(
        mockTimetableService.createTeachingAssignment,
      ).toHaveBeenCalledWith(dto);
    });

    it('rejects createTeachingAssignment for non-admin', async () => {
      await expect(
        controller.createTeachingAssignment(dto, [Role.INSTRUCTOR]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates teaching assignment for admin', async () => {
      mockTimetableService.updateTeachingAssignment.mockResolvedValue({
        id: 'assign-1',
        ...dto,
        academicHours: 48,
      });

      const result = await controller.updateTeachingAssignment(
        'assign-1',
        { academicHours: 48 },
        [Role.ADMIN],
      );

      expect(result).toEqual({ id: 'assign-1', ...dto, academicHours: 48 });
      expect(
        mockTimetableService.updateTeachingAssignment,
      ).toHaveBeenCalledWith('assign-1', { academicHours: 48 });
    });

    it('rejects updateTeachingAssignment for non-admin', async () => {
      await expect(
        controller.updateTeachingAssignment('assign-1', { academicHours: 48 }, [
          Role.INSTRUCTOR,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lists teaching assignments by planId using query DTO for admin', async () => {
      mockTimetableService.listTeachingAssignments.mockResolvedValue([]);

      const query: ListTeachingAssignmentsQueryDto = {
        curriculumPlanId: '11111111-1111-1111-1111-111111111111',
      };

      const result = await controller.listTeachingAssignments(query, [
        Role.ADMIN,
      ]);

      expect(result).toEqual([]);
      expect(mockTimetableService.listTeachingAssignments).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
      );
    });

    it('rejects listTeachingAssignments for non-admin', async () => {
      const query: ListTeachingAssignmentsQueryDto = {
        curriculumPlanId: '11111111-1111-1111-1111-111111111111',
      };

      await expect(
        controller.listTeachingAssignments(query, [Role.INSTRUCTOR]),
      ).rejects.toThrow(ForbiddenException);
      expect(
        mockTimetableService.listTeachingAssignments,
      ).not.toHaveBeenCalled();
    });

    it('lists own teaching assignments for authenticated teacher', async () => {
      const ownAssignments = [{ id: 'assign-1', teacherId: 'teacher-1' }];

      mockTimetableService.listTeacherAssignments.mockResolvedValue(
        ownAssignments,
      );

      const result = await controller.listMyTeachingAssignments('teacher-1');

      expect(result).toEqual(ownAssignments);
      expect(mockTimetableService.listTeacherAssignments).toHaveBeenCalledWith(
        'teacher-1',
      );
    });

    it('updates meeting URL', async () => {
      const updateDto: UpdateMeetingUrlDto = {
        meetingUrl: 'https://meet.google.com/abc',
      };

      mockTimetableService.updateMeetingUrl.mockResolvedValue({
        id: 'assign-1',
        meetingUrl: updateDto.meetingUrl,
      });

      const result = await controller.updateMeetingUrl(
        'assign-1',
        updateDto,
        'teacher-1',
        [Role.INSTRUCTOR],
      );

      expect(result).toEqual({
        id: 'assign-1',
        meetingUrl: updateDto.meetingUrl,
      });
      expect(mockTimetableService.updateMeetingUrl).toHaveBeenCalledWith(
        'assign-1',
        updateDto.meetingUrl,
        { userId: 'teacher-1', roles: [Role.INSTRUCTOR] },
      );
    });
  });

  describe('semester calendar', () => {
    const dto: CreateSemesterCalendarDto = {
      academicYear: '2026/2027',
      semester: 1,
      startDate: '2026-09-07',
      teachingWeeks: 16,
    };

    it('configures semester calendar for admin', async () => {
      mockTimetableService.configureSemesterCalendar.mockResolvedValue({
        id: 'cal-1',
        ...dto,
      });

      const result = await controller.configureSemesterCalendar(dto, [
        Role.ADMIN,
      ]);

      expect(result).toEqual({ id: 'cal-1', ...dto });
      expect(
        mockTimetableService.configureSemesterCalendar,
      ).toHaveBeenCalledWith(dto);
    });

    it('rejects configureSemesterCalendar for non-admin', async () => {
      await expect(
        controller.configureSemesterCalendar(dto, [Role.OPPORTUNITIES_USER]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('gets semester calendar using query DTO for admin', async () => {
      mockTimetableService.getSemesterCalendar.mockResolvedValue({
        id: 'cal-1',
      });

      const query: GetSemesterCalendarQueryDto = {
        academicYear: '2026/2027',
        semester: 1,
      };

      const result = await controller.getSemesterCalendar(query, [Role.ADMIN]);

      expect(result).toEqual({ id: 'cal-1' });
      expect(mockTimetableService.getSemesterCalendar).toHaveBeenCalledWith(
        '2026/2027',
        1,
      );
    });

    it('rejects getSemesterCalendar for non-admin', async () => {
      const query: GetSemesterCalendarQueryDto = {
        academicYear: '2026/2027',
        semester: 1,
      };

      await expect(
        controller.getSemesterCalendar(query, [Role.INSTRUCTOR]),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTimetableService.getSemesterCalendar).not.toHaveBeenCalled();
    });
  });

  describe('teacher unavailability', () => {
    const dto: CreateTeacherUnavailabilityDto = {
      date: '2026-09-10',
      pair: 2,
    };

    it('allows teacher to request unavailability for themselves', async () => {
      mockTimetableService.requestTeacherUnavailability.mockResolvedValue({
        id: 'unavail-1',
      });

      const result = await controller.requestTeacherUnavailability(
        'teacher-1',
        dto,
        'teacher-1',
        [Role.INSTRUCTOR],
      );

      expect(result).toEqual({ id: 'unavail-1' });
      expect(
        mockTimetableService.requestTeacherUnavailability,
      ).toHaveBeenCalledWith('teacher-1', dto);
    });

    it('allows admin to request unavailability for another teacher', async () => {
      mockTimetableService.requestTeacherUnavailability.mockResolvedValue({
        id: 'unavail-1',
      });

      const result = await controller.requestTeacherUnavailability(
        'teacher-1',
        dto,
        'admin-user',
        [Role.ADMIN],
      );

      expect(result).toEqual({ id: 'unavail-1' });
    });

    it('rejects requesting unavailability for another teacher if not admin', async () => {
      await expect(
        controller.requestTeacherUnavailability('teacher-1', dto, 'teacher-2', [
          Role.INSTRUCTOR,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('confirms teacher unavailability for admin', async () => {
      const confirmDto: ConfirmTeacherUnavailabilityDto = { isConfirmed: true };

      mockTimetableService.confirmTeacherUnavailability.mockResolvedValue({
        id: 'unavail-1',
        isConfirmed: true,
      });

      const result = await controller.confirmTeacherUnavailability(
        'unavail-1',
        confirmDto,
        [Role.ADMIN],
      );

      expect(result).toEqual({ id: 'unavail-1', isConfirmed: true });
      expect(
        mockTimetableService.confirmTeacherUnavailability,
      ).toHaveBeenCalledWith('unavail-1', true);
    });

    it('rejects confirmTeacherUnavailability for non-admin', async () => {
      await expect(
        controller.confirmTeacherUnavailability(
          'unavail-1',
          { isConfirmed: true },
          [Role.INSTRUCTOR],
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('timetable draft generation and publication', () => {
    const generateDto: GenerateTimetableDto = {
      maxCandidates: 1,
      timeoutMs: 1000,
    };

    it('generates timetable draft for admin', async () => {
      mockTimetableService.generateTimetableDraft.mockResolvedValue({
        versionId: 'ver-1',
      });

      const result = await controller.generateTimetableDraft(
        'plan-1',
        generateDto,
        'admin-1',
        [Role.ADMIN],
      );

      expect(result).toEqual({ versionId: 'ver-1' });
      expect(mockTimetableService.generateTimetableDraft).toHaveBeenCalledWith(
        'plan-1',
        { ...generateDto, userId: 'admin-1' },
      );
    });

    it('rejects generateTimetableDraft for non-admin', async () => {
      await expect(
        controller.generateTimetableDraft('plan-1', generateDto, 'user-1', [
          Role.INSTRUCTOR,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('publishes timetable version for admin', async () => {
      mockTimetableService.publishTimetableVersion.mockResolvedValue({
        id: 'ver-1',
        status: 'PUBLISHED',
      });

      const result = await controller.publishTimetableVersion(
        'ver-1',
        'admin-1',
        [Role.ADMIN],
      );

      expect(result).toEqual({ id: 'ver-1', status: 'PUBLISHED' });
      expect(mockTimetableService.publishTimetableVersion).toHaveBeenCalledWith(
        'ver-1',
        'admin-1',
      );
    });

    it('rejects publishTimetableVersion for non-admin', async () => {
      await expect(
        controller.publishTimetableVersion('ver-1', 'user-1', [
          Role.INSTRUCTOR,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('calendar feeds and tokens', () => {
    it('creates or reuses calendar subscription token for authenticated user', async () => {
      mockTimetableService.createSubscriptionToken.mockResolvedValue({
        token: 'base64url-token',
      });

      const result = await controller.createSubscriptionToken('user-1');

      expect(result).toEqual({ token: 'base64url-token' });
      expect(mockTimetableService.createSubscriptionToken).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('rotates calendar subscription token for authenticated user', async () => {
      mockTimetableService.rotateSubscriptionToken.mockResolvedValue({
        token: 'rotated-token',
      });

      const result = await controller.rotateSubscriptionToken('user-1');

      expect(result).toEqual({ token: 'rotated-token' });
      expect(mockTimetableService.rotateSubscriptionToken).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('revokes calendar subscription tokens for authenticated user', async () => {
      mockTimetableService.revokeSubscriptionTokens.mockResolvedValue({
        count: 2,
      });

      const result = await controller.revokeSubscriptionTokens('user-1');

      expect(result).toEqual({ count: 2 });
      expect(
        mockTimetableService.revokeSubscriptionTokens,
      ).toHaveBeenCalledWith('user-1');
    });

    it('returns public ICS calendar feed', async () => {
      const icsString = 'BEGIN:VCALENDAR\nEND:VCALENDAR';

      mockTimetableService.getIcsFeed.mockResolvedValue(icsString);

      const result = await controller.getCalendarFeed(
        'feed-token-1234567890abcd',
      );

      expect(result).toBe(icsString);
      expect(mockTimetableService.getIcsFeed).toHaveBeenCalledWith(
        'feed-token-1234567890abcd',
      );
    });
  });

  describe('route parameter validation pipes', () => {
    function getPipesForParam(
      methodName: string,
      paramIndex: number,
    ): unknown[] {
      const metadata = Reflect.getMetadata(
        '__routeArguments__',
        TimetableController,
        methodName,
      );

      if (!metadata) {
        return [];
      }

      const entry = Object.values(metadata).find(
        (val: unknown) =>
          typeof val === 'object' &&
          val !== null &&
          'index' in val &&
          (val as { index: number }).index === paramIndex,
      ) as { pipes?: unknown[] } | undefined;

      return entry?.pipes ?? [];
    }

    it('applies ParseUUIDPipe to curriculum plan id param', () => {
      expect(getPipesForParam('deleteTeachingAssignment', 0)).toContain(
        ParseUUIDPipe,
      );
      const pipes = getPipesForParam('getCurriculumPlan', 0);

      expect(pipes).toContain(ParseUUIDPipe);
    });

    it('applies ParseUUIDPipe to updateMeetingUrl assignment id param', () => {
      const pipes = getPipesForParam('updateMeetingUrl', 0);

      expect(pipes).toContain(ParseUUIDPipe);
    });

    it('applies ParseUUIDPipe to requestTeacherUnavailability teacherId param', () => {
      const pipes = getPipesForParam('requestTeacherUnavailability', 0);

      expect(pipes).toContain(ParseUUIDPipe);
    });

    it('applies ParseUUIDPipe to confirmTeacherUnavailability id param', () => {
      const pipes = getPipesForParam('confirmTeacherUnavailability', 0);

      expect(pipes).toContain(ParseUUIDPipe);
    });

    it('applies ParseUUIDPipe to generateTimetableDraft plan id param', () => {
      const pipes = getPipesForParam('generateTimetableDraft', 0);

      expect(pipes).toContain(ParseUUIDPipe);
    });

    it('applies ParseUUIDPipe to publishTimetableVersion version id param', () => {
      const pipes = getPipesForParam('publishTimetableVersion', 0);

      expect(pipes).toContain(ParseUUIDPipe);
    });

    it('applies ParseUUIDPipe to adjustDraftSlot', () => {
      expect(getPipesForParam('adjustDraftSlot', 0)).toContain(ParseUUIDPipe);
    });

    it('applies ParseFeedTokenPipe to getCalendarFeed token param and validates base64url tokens', () => {
      const pipes = getPipesForParam('getCalendarFeed', 0);

      expect(pipes).toContain(ParseFeedTokenPipe);

      const pipe = new ParseFeedTokenPipe();

      expect(pipe.transform('abcdef1234567890_ABCDEF-12345678')).toBe(
        'abcdef1234567890_ABCDEF-12345678',
      );
      expect(() => pipe.transform('short')).toThrow(BadRequestException);
      expect(() => pipe.transform('invalid token with spaces!')).toThrow(
        BadRequestException,
      );
    });
  });
});
