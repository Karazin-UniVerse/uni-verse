import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimetableReschedulingService } from './timetable-rescheduling.service';

describe('TimetableReschedulingService preview', () => {
  const event = {
    id: 'event-1',
    timetableVersionId: 'version-1',
    teachingAssignmentId: 'assignment-1',
    date: new Date('2027-10-04'),
    pair: 1,
    pairSpan: 1,
    isCancelled: false,
    teacherIdSnapshot: 'teacher-1',
    teachingTypeSnapshot: 'LECTURE',
    disciplineTitleSnapshot: 'Calculus',
    teachingAssignment: {
      teacherId: 'teacher-1',
      groupId: 'group-1',
      subgroupId: null,
      streamId: null,
      group: { id: 'group-1' },
      isSaturdayOnly: false,
      hasLateSlotAuthorization: false,
    },
    timetableVersion: {
      status: 'PUBLISHED',
      semesterCalendarId: 'semester-1',
      semesterCalendar: {
        startDate: new Date('2027-09-06'),
        teachingWeeks: 16,
        excludedDates: [],
        makeupSaturdays: [],
      },
    },
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    timetableEvent: { findUnique: jest.fn(), findMany: jest.fn() },
    teacherUnavailability: { findMany: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    timetableRescheduleAudit: { createMany: jest.fn() },
  };
  const service = new TimetableReschedulingService(
    prisma as unknown as PrismaService,
  );
  const input = {
    eventId: 'event-1',
    newDate: '2027-10-05',
    newPair: 2,
    scope: 'ONCE' as const,
    reason: 'Conference',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'teacher-1',
      roles: ['INSTRUCTOR'],
    });
    prisma.timetableEvent.findUnique.mockResolvedValue(event);
    prisma.timetableEvent.findMany.mockResolvedValue([event]);
    prisma.teacherUnavailability.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );
  });

  it('previews an instructor-owned occurrence without changing published events', async () => {
    await expect(
      service.preview(input, 'teacher-1', 'INSTRUCTOR'),
    ).resolves.toEqual({
      changes: [
        {
          eventId: 'event-1',
          oldDate: '2027-10-04',
          oldPair: 1,
          newDate: '2027-10-05',
          newPair: 2,
        },
      ],
    });
  });

  it('authorizes a Saturday only for the selected version', async () => {
    const target = { ...input, newDate: '2027-10-09' };

    await expect(
      service.preview(target, 'teacher-1', 'INSTRUCTOR'),
    ).rejects.toThrow(BadRequestException);
    prisma.timetableEvent.findUnique.mockResolvedValue({
      ...event,
      timetableVersion: {
        ...event.timetableVersion,
        automaticMakeupDates: [target.newDate],
      },
    });

    await expect(
      service.preview(target, 'teacher-1', 'INSTRUCTOR'),
    ).resolves.toMatchObject({
      changes: [{ newDate: target.newDate }],
    });
  });

  it('rejects another instructor before revealing a proposal', async () => {
    await expect(
      service.preview(input, 'teacher-2', 'INSTRUCTOR'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects cancelled published events', async () => {
    prisma.timetableEvent.findUnique.mockResolvedValue({
      ...event,
      isCancelled: true,
    });

    await expect(
      service.preview(input, 'teacher-1', 'INSTRUCTOR'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a target occupied by another class of the teacher', async () => {
    prisma.timetableEvent.findMany
      .mockResolvedValueOnce([event])
      .mockResolvedValueOnce([
        event,
        {
          ...event,
          id: 'occupied',
          teachingAssignmentId: 'other-assignment',
          date: new Date(input.newDate),
          pair: input.newPair,
        },
      ]);

    await expect(
      service.preview(input, 'teacher-1', 'INSTRUCTOR'),
    ).rejects.toThrow(ConflictException);
  });

  it('bounds the occupancy query to affected dates and the same semester', async () => {
    await service.preview(input, 'teacher-1', 'INSTRUCTOR');

    const occupancyQuery = prisma.timetableEvent.findMany.mock.calls[1][0];

    expect(occupancyQuery.where).toEqual({
      isCancelled: false,
      timetableVersion: { status: 'PUBLISHED' },
      OR: [
        { date: { in: [new Date('2027-10-04'), new Date('2027-10-05')] } },
        { timetableVersion: { semesterCalendarId: 'semester-1' } },
      ],
    });
  });

  it('applies the move with an audit in the same transaction', async () => {
    const update = jest.fn().mockResolvedValue(event);

    Object.assign(prisma.timetableEvent, { update });

    await expect(service.reschedule(input, 'admin-1')).rejects.toThrow(
      ForbiddenException,
    );
    prisma.user.findUnique.mockResolvedValue({ roles: ['ADMIN'] });

    await expect(service.reschedule(input, 'admin-1')).resolves.toMatchObject({
      changes: [{ eventId: event.id }],
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: event.id },
      data: { date: new Date(input.newDate), pair: 2 },
    });
    expect(prisma.timetableRescheduleAudit.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          actorId: 'admin-1',
          eventId: event.id,
          reason: 'Conference',
        }),
      ],
    });
  });

  it('rejects missing events, unpublished events, and Saturday-only moves to weekdays', async () => {
    prisma.timetableEvent.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.preview(input, 'teacher-1', 'INSTRUCTOR'),
    ).rejects.toThrow(NotFoundException);

    prisma.timetableEvent.findUnique.mockResolvedValueOnce({
      ...event,
      timetableVersion: { ...event.timetableVersion, status: 'DRAFT' },
    });
    await expect(
      service.preview(input, 'teacher-1', 'INSTRUCTOR'),
    ).rejects.toThrow(BadRequestException);

    const saturdayEvent = {
      ...event,
      date: new Date('2027-10-09'),
      teachingAssignment: { ...event.teachingAssignment, isSaturdayOnly: true },
    };

    prisma.timetableEvent.findUnique.mockResolvedValueOnce(saturdayEvent);
    prisma.timetableEvent.findMany.mockResolvedValueOnce([saturdayEvent]);
    await expect(
      service.preview(input, 'teacher-1', 'INSTRUCTOR'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects confirmed teacher unavailability and overlapping distinct stream occurrences', async () => {
    prisma.teacherUnavailability.findMany.mockResolvedValueOnce([
      {
        teacherId: 'teacher-1',
        date: new Date(input.newDate),
        pair: input.newPair,
        isConfirmed: true,
      },
    ]);
    await expect(
      service.preview(input, 'teacher-1', 'INSTRUCTOR'),
    ).rejects.toThrow(ConflictException);

    const streamEvent = {
      ...event,
      teachingAssignment: {
        ...event.teachingAssignment,
        groupId: null,
        group: null,
        streamId: 'stream-1',
        stream: { groups: [{ id: 'group-1' }, { id: 'group-2' }] },
      },
    };
    const nextStreamEvent = {
      ...streamEvent,
      id: 'event-2',
      date: new Date(input.newDate),
      pair: input.newPair,
    };

    prisma.timetableEvent.findUnique.mockResolvedValueOnce(streamEvent);
    prisma.timetableEvent.findMany
      .mockResolvedValueOnce([streamEvent, nextStreamEvent])
      .mockResolvedValueOnce([streamEvent, nextStreamEvent]);

    await expect(
      service.preview(input, 'teacher-1', 'INSTRUCTOR'),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects moving a lecture after a dependent practical and translates serialization conflicts', async () => {
    const practical = {
      ...event,
      id: 'practical-1',
      teachingAssignmentId: 'assignment-prac',
      date: new Date('2027-10-06'),
      pair: 1,
      teachingTypeSnapshot: 'PRACTICAL',
      teachingAssignment: {
        ...event.teachingAssignment,
        teacherId: 'teacher-2',
      },
    };

    prisma.timetableEvent.findMany
      .mockResolvedValueOnce([event])
      .mockResolvedValueOnce([event, practical]);

    await expect(
      service.preview(
        { ...input, newDate: '2027-10-07', newPair: 2 },
        'teacher-1',
        'INSTRUCTOR',
      ),
    ).rejects.toThrow(ConflictException);

    prisma.user.findUnique.mockResolvedValue({ roles: ['ADMIN'] });
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });

    await expect(service.reschedule(input, 'admin-1')).rejects.toThrow(
      ConflictException,
    );
  });
});
