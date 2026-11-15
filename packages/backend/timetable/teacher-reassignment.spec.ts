import { ConflictException } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('teacher reassignment', () => {
  const assignment = {
    id: 'a',
    teacherId: 'old',
    groupId: 'g',
    subgroupId: null,
    streamId: null,
    curriculumPlanId: 'p',
    academicHours: 2,
  };
  const event = {
    id: 'e',
    timetableVersionId: 'version',
    teachingAssignmentId: 'a',
    teacherIdSnapshot: 'old',
    date: new Date('2035-09-03'),
    pair: 1,
    pairSpan: 1,
    teachingTypeSnapshot: 'LECTURE',
    disciplineTitleSnapshot: 'A',
    teachingAssignment: assignment,
    timetableVersion: {
      status: 'PUBLISHED',
      automaticMakeupDates: [],
      semesterCalendar: { makeupSaturdays: [] },
    },
  };
  const prisma = {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    teachingAssignment: { findUnique: jest.fn(), update: jest.fn() },
    timetableEvent: {
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    teacherUnavailability: { findMany: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    calendarSubscriptionToken: { findUnique: jest.fn(), update: jest.fn() },
  };
  const service = new TimetableService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );
    prisma.teachingAssignment.findUnique.mockResolvedValue(assignment);
    prisma.teachingAssignment.update.mockResolvedValue(assignment);
    prisma.timetableEvent.findMany.mockResolvedValue([event]);
    prisma.teacherUnavailability.findMany.mockResolvedValue([]);
    prisma.user.findUnique.mockResolvedValue({
      id: 'student',
      academicGroupId: 'g',
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 'old', name: 'Original teacher' },
    ]);
    prisma.calendarSubscriptionToken.findUnique.mockResolvedValue({
      id: 'token',
      isActive: true,
      user: { id: 'student', academicGroupId: 'g' },
    });
  });

  it('updates future snapshots under the publication lock', async () => {
    await service.updateTeachingAssignment('a', { teacherId: 'new' });

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.timetableEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['e'] } }),
        data: { teacherIdSnapshot: 'new' },
      }),
    );
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.teachingAssignment.findUnique.mock.invocationCallOrder[0],
    );
  });

  it('rejects a replacement teacher already booked at that time', async () => {
    prisma.timetableEvent.findMany.mockResolvedValue([
      event,
      {
        ...event,
        id: 'other',
        teachingAssignmentId: 'b',
        teacherIdSnapshot: 'new',
        teachingAssignment: { ...assignment, id: 'b', groupId: 'other' },
      },
    ]);

    await expect(
      service.updateTeachingAssignment('a', { teacherId: 'new' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.teachingAssignment.update).not.toHaveBeenCalled();
    expect(prisma.timetableEvent.updateMany).not.toHaveBeenCalled();
  });

  it('keeps past snapshots unchanged when replacing the teacher', async () => {
    prisma.timetableEvent.findMany.mockResolvedValue([
      event,
      { ...event, id: 'past', date: new Date('2020-09-07') },
    ]);

    await service.updateTeachingAssignment('a', { teacherId: 'new' });

    expect(prisma.timetableEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['e'] } },
      data: { teacherIdSnapshot: 'new' },
    });
  });

  it('rejects confirmed unavailability of the replacement teacher', async () => {
    prisma.teacherUnavailability.findMany.mockResolvedValue([
      { teacherId: 'new', date: event.date, pair: 1, isConfirmed: true },
    ]);

    await expect(
      service.updateTeachingAssignment('a', { teacherId: 'new' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.teachingAssignment.update).not.toHaveBeenCalled();
  });

  it('clears a teacher with an explicit null', async () => {
    await service.updateTeachingAssignment('a', { teacherId: null });

    expect(prisma.timetableEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['e'] } },
      data: { teacherIdSnapshot: null },
    });
    expect(prisma.teachingAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teacherId: null }),
      }),
    );
  });

  it.each([null, 'old'])(
    'keeps historical teacher %p in JSON and subscription feeds',
    async (snapshot) => {
      prisma.timetableEvent.findMany.mockResolvedValue([
        {
          ...event,
          teacherIdSnapshot: snapshot,
          teachingAssignment: {
            ...assignment,
            teacherId: 'new',
            teacher: { name: 'Replacement teacher' },
          },
        },
      ]);

      const events = await service.getMyScheduleEvents('student');
      const feed = await service.getIcsFeed('token');

      expect(events[0].teacherName).toBe(
        snapshot === null ? undefined : 'Original teacher',
      );
      expect(feed).not.toContain('Replacement teacher');

      if (snapshot !== null) expect(feed).toContain('Original teacher');

      expect(prisma.timetableEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { teacherIdSnapshot: 'student' },
              { teachingAssignment: { OR: expect.any(Array) } },
            ],
          }),
        }),
      );
    },
  );

  it('checks other assignments in the affected draft version', async () => {
    const draft = {
      ...event,
      timetableVersion: { ...event.timetableVersion, status: 'DRAFT' },
    };

    prisma.timetableEvent.findMany.mockResolvedValue([
      draft,
      {
        ...draft,
        id: 'other',
        teachingAssignmentId: 'b',
        teacherIdSnapshot: 'new',
        teachingAssignment: { ...assignment, id: 'b', groupId: 'other' },
      },
    ]);

    await expect(
      service.updateTeachingAssignment('a', { teacherId: 'new' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.timetableEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              timetableVersion: {
                status: 'DRAFT',
                events: { some: { teachingAssignmentId: 'a' } },
              },
            },
          ]),
        }),
      }),
    );
    expect(prisma.teachingAssignment.update).not.toHaveBeenCalled();
  });
});
