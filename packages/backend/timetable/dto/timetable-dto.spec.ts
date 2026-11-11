import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { TeachingType } from '@universe/database';
import {
  ConfirmTeacherUnavailabilityDto,
  CreateSemesterCalendarDto,
  CreateTeacherUnavailabilityDto,
  CreateTeachingAssignmentDto,
  GetSemesterCalendarQueryDto,
  ListTeachingAssignmentsQueryDto,
  MakeupSaturdayDto,
  UpdateTeachingAssignmentDto,
} from './index';

describe('Timetable DTOs', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  describe('CreateTeachingAssignmentDto', () => {
    const validAssignment = {
      curriculumPlanId: 'plan-123',
      disciplineTitle: 'Discrete Mathematics',
      teachingType: TeachingType.LECTURE,
      academicHours: 32,
      teacherId: 'teacher-456',
      groupId: 'group-789',
      isSaturdayOnly: false,
      hasLateSlotAuthorization: false,
    };

    it('should validate a correct assignment payload', () => {
      const dto = plainToInstance(CreateTeachingAssignmentDto, validAssignment);

      expect(validateSync(dto)).toEqual([]);
    });

    it('should validate a correct assignment payload with valid HTTP and HTTPS meetingUrl', () => {
      const httpDto = plainToInstance(CreateTeachingAssignmentDto, {
        ...validAssignment,
        meetingUrl: 'http://example.com/room-1',
      });
      const httpsDto = plainToInstance(CreateTeachingAssignmentDto, {
        ...validAssignment,
        meetingUrl: 'https://teams.microsoft.com/l/meetup-join/123',
      });

      expect(validateSync(httpDto)).toEqual([]);
      expect(validateSync(httpsDto)).toEqual([]);
    });

    it('should reject non-positive academic hours', () => {
      const dto = plainToInstance(CreateTeachingAssignmentDto, {
        ...validAssignment,
        academicHours: 0,
      });

      const errors = validateSync(dto);

      expect(errors).toEqual([
        expect.objectContaining({ property: 'academicHours' }),
      ]);
    });

    it('should reject invalid teaching type', () => {
      const dto = plainToInstance(CreateTeachingAssignmentDto, {
        ...validAssignment,
        teachingType: 'INVALID_TYPE',
      });

      const errors = validateSync(dto);

      expect(errors).toEqual([
        expect.objectContaining({ property: 'teachingType' }),
      ]);
    });

    it.each([
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'ftp://example.com/meeting',
      'not-a-url',
      'example.com/meeting',
    ])('should reject invalid meetingUrl %s', (invalidUrl) => {
      const dto = plainToInstance(CreateTeachingAssignmentDto, {
        ...validAssignment,
        meetingUrl: invalidUrl,
      });

      const errors = validateSync(dto);

      expect(errors).toEqual([
        expect.objectContaining({ property: 'meetingUrl' }),
      ]);
    });
  });

  describe('UpdateTeachingAssignmentDto', () => {
    it('should validate valid update with https meetingUrl', () => {
      const dto = plainToInstance(UpdateTeachingAssignmentDto, {
        meetingUrl: 'https://meet.google.com/xyz-abc-def',
      });

      expect(validateSync(dto)).toEqual([]);
    });

    it.each([
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'ftp://example.com/meeting',
      'just-text',
    ])('should reject invalid meetingUrl %s', (invalidUrl) => {
      const dto = plainToInstance(UpdateTeachingAssignmentDto, {
        meetingUrl: invalidUrl,
      });

      const errors = validateSync(dto);

      expect(errors).toEqual([
        expect.objectContaining({ property: 'meetingUrl' }),
      ]);
    });
  });

  describe('CreateSemesterCalendarDto', () => {
    const validCalendar = {
      academicYear: '2026/2027',
      semester: 1,
      startDate: '2026-09-01',
      teachingWeeks: 16,
      excludedDates: ['2026-10-14'],
      makeupSaturdays: [{ date: '2026-10-24', followsWeekday: 3 }],
    };

    it('should validate a correct semester calendar payload', () => {
      const dto = plainToInstance(CreateSemesterCalendarDto, validCalendar);

      expect(validateSync(dto)).toEqual([]);
    });

    it('should reject semester outside 1..2', () => {
      const dto = plainToInstance(CreateSemesterCalendarDto, {
        ...validCalendar,
        semester: 3,
      });

      const errors = validateSync(dto);

      expect(errors).toEqual([
        expect.objectContaining({ property: 'semester' }),
      ]);
    });

    it('should reject invalid makeup Saturday weekday', () => {
      const dto = plainToInstance(CreateSemesterCalendarDto, {
        ...validCalendar,
        makeupSaturdays: [{ date: '2026-10-24', followsWeekday: 6 }],
      });

      const errors = validateSync(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('makeupSaturdays');
    });

    it.each([
      '2026-09-01T00:00:00.000Z',
      '2026-09-01 10:00:00',
      '01-09-2026',
      '2026/09/01',
      '2026-02-30',
      '2026-13-01',
      '2026-04-31',
    ])('should reject timestamp or impossible startDate %s', (invalidDate) => {
      const dto = plainToInstance(CreateSemesterCalendarDto, {
        ...validCalendar,
        startDate: invalidDate,
      });

      const errors = validateSync(dto);

      expect(errors).toEqual([
        expect.objectContaining({ property: 'startDate' }),
      ]);
    });

    it.each([
      ['2026-10-14T10:00:00.000Z'],
      ['2026-02-30'],
      ['2026-13-40'],
      ['not-a-date'],
    ])(
      'should reject timestamp or impossible excludedDates %s',
      (excludedDates) => {
        const dto = plainToInstance(CreateSemesterCalendarDto, {
          ...validCalendar,
          excludedDates,
        });

        const errors = validateSync(dto);

        expect(errors).toEqual([
          expect.objectContaining({ property: 'excludedDates' }),
        ]);
      },
    );
  });

  describe('MakeupSaturdayDto', () => {
    it('should validate valid makeup Saturday', () => {
      const dto = plainToInstance(MakeupSaturdayDto, {
        date: '2026-10-24',
        followsWeekday: 2,
      });

      expect(validateSync(dto)).toEqual([]);
    });

    it.each([
      '2026-10-24T00:00:00.000Z',
      '2026-10-24 14:00:00',
      '2026-02-30',
      '2026-11-31',
    ])('should reject timestamp or impossible date %s', (invalidDate) => {
      const dto = plainToInstance(MakeupSaturdayDto, {
        date: invalidDate,
        followsWeekday: 2,
      });

      const errors = validateSync(dto);

      expect(errors).toEqual([expect.objectContaining({ property: 'date' })]);
    });
  });

  describe('CreateTeacherUnavailabilityDto', () => {
    it('should validate correct unavailability request', () => {
      const dto = plainToInstance(CreateTeacherUnavailabilityDto, {
        date: '2026-10-12',
        pair: 3,
        reason: 'Conference presentation',
      });

      expect(validateSync(dto)).toEqual([]);
    });

    it('should reject invalid pair number', () => {
      const dto = plainToInstance(CreateTeacherUnavailabilityDto, {
        date: '2026-10-12',
        pair: 8,
      });

      const errors = validateSync(dto);

      expect(errors).toEqual([expect.objectContaining({ property: 'pair' })]);
    });

    it.each([
      '2026-10-12T08:30:00.000Z',
      '2026-10-12 08:30:00',
      '2026-02-30',
      '2026-13-05',
    ])('should reject timestamp or impossible date %s', (invalidDate) => {
      const dto = plainToInstance(CreateTeacherUnavailabilityDto, {
        date: invalidDate,
        pair: 2,
      });

      const errors = validateSync(dto);

      expect(errors).toEqual([expect.objectContaining({ property: 'date' })]);
    });
  });

  describe('ConfirmTeacherUnavailabilityDto', () => {
    it('should validate confirmation payload', async () => {
      const transformed = await pipe.transform(
        { isConfirmed: true, reason: 'Approved by Dean' },
        { type: 'body', metatype: ConfirmTeacherUnavailabilityDto },
      );

      expect(transformed).toEqual({
        isConfirmed: true,
        reason: 'Approved by Dean',
      });
    });

    it('should reject non-boolean confirmation status', async () => {
      await expect(
        pipe.transform(
          { isConfirmed: 'yes' },
          { type: 'body', metatype: ConfirmTeacherUnavailabilityDto },
        ),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('ListTeachingAssignmentsQueryDto', () => {
    it('should validate valid UUID curriculumPlanId', () => {
      const dto = plainToInstance(ListTeachingAssignmentsQueryDto, {
        curriculumPlanId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(validateSync(dto)).toEqual([]);
    });

    it('should reject non-UUID curriculumPlanId', () => {
      const dto = plainToInstance(ListTeachingAssignmentsQueryDto, {
        curriculumPlanId: 'not-a-uuid',
      });

      const errors = validateSync(dto);

      expect(errors).toEqual([
        expect.objectContaining({ property: 'curriculumPlanId' }),
      ]);
    });
  });

  describe('GetSemesterCalendarQueryDto', () => {
    it('should validate valid query payload and transform semester to number', async () => {
      const transformed = await pipe.transform(
        { academicYear: '2026/2027', semester: '2' },
        { type: 'query', metatype: GetSemesterCalendarQueryDto },
      );

      expect(transformed).toEqual({
        academicYear: '2026/2027',
        semester: 2,
      });
    });

    it('should reject semester outside 1..2', async () => {
      await expect(
        pipe.transform(
          { academicYear: '2026/2027', semester: '3' },
          { type: 'query', metatype: GetSemesterCalendarQueryDto },
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('should reject non-integer semester', async () => {
      await expect(
        pipe.transform(
          { academicYear: '2026/2027', semester: 'invalid' },
          { type: 'query', metatype: GetSemesterCalendarQueryDto },
        ),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
