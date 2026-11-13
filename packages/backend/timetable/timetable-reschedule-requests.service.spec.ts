import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimetableReschedulingService } from './timetable-rescheduling.service';
import { TimetableRescheduleRequestsService } from './timetable-reschedule-requests.service';

describe('TimetableRescheduleRequestsService', () => {
  const tx = {
    user: { findUnique: jest.fn() },
    timetableRescheduleRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function'
        ? arg(tx)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  const rescheduling = { buildProposal: jest.fn(), apply: jest.fn() };
  const service = new TimetableRescheduleRequestsService(
    prisma as unknown as PrismaService,
    rescheduling as unknown as TimetableReschedulingService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tx.user.findUnique.mockResolvedValue({ roles: ['ADMIN'] });
  });

  it('refuses a second decision', async () => {
    tx.timetableRescheduleRequest.findUnique.mockResolvedValue({
      status: 'APPROVED',
    });

    await expect(
      service.reject('request-1', 'admin-1', 'Not possible'),
    ).rejects.toThrow(ConflictException);
    expect(tx.timetableRescheduleRequest.update).not.toHaveBeenCalled();
  });

  it('rejects instructor decisions', async () => {
    tx.user.findUnique.mockResolvedValue({ roles: ['INSTRUCTOR'] });

    await expect(
      service.reject('request-1', 'teacher-1', 'Not possible'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('approves a pending request atomically and translates serialization conflicts', async () => {
    const requestRecord = {
      id: 'request-1',
      requesterId: 'teacher-1',
      eventId: 'event-1',
      newDate: new Date('2027-10-05'),
      newPair: 2,
      scope: 'ONCE',
      reason: 'Conference',
      status: 'PENDING',
      createdAt: new Date('2027-10-01T00:00:00Z'),
      decidedAt: null,
      decisionExplanation: null,
      requester: { name: 'Teacher' },
      event: {
        disciplineTitleSnapshot: 'Calculus',
        teachingAssignment: { disciplineTitle: 'Calculus' },
      },
      occurrences: [
        {
          eventId: 'event-1',
          oldDate: new Date('2027-10-04'),
          oldPair: 1,
          newDate: new Date('2027-10-05'),
          newPair: 2,
          sourceContext: { id: 'event-1' },
        },
      ],
    };

    tx.timetableRescheduleRequest.findUnique.mockResolvedValue(requestRecord);
    Object.assign(tx, {
      timetableEvent: {
        findMany: jest.fn().mockResolvedValue([{ id: 'event-1' }]),
      },
    });
    rescheduling.buildProposal.mockResolvedValue({
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
    tx.timetableRescheduleRequest.update.mockResolvedValue({
      ...requestRecord,
      status: 'APPROVED',
      decidedAt: new Date('2027-10-02T00:00:00Z'),
    });

    const approved = await service.approve('request-1', 'admin-1');

    expect(approved.status).toBe('APPROVED');
    expect(rescheduling.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        reason: 'Conference',
        requestId: 'request-1',
      }),
    );

    prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });
    await expect(service.approve('request-1', 'admin-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects stale approvals when source context or series membership changes', async () => {
    const requestRecord = {
      id: 'request-1',
      requesterId: 'teacher-1',
      eventId: 'event-1',
      newDate: new Date('2027-10-05'),
      newPair: 2,
      scope: 'SERIES',
      reason: 'Conference',
      status: 'PENDING',
      createdAt: new Date('2027-10-01T00:00:00Z'),
      decidedAt: null,
      decisionExplanation: null,
      requester: { name: 'Teacher' },
      event: {
        disciplineTitleSnapshot: 'Calculus',
        teachingAssignment: { disciplineTitle: 'Calculus' },
      },
      occurrences: [
        {
          eventId: 'event-1',
          oldDate: new Date('2027-10-04'),
          oldPair: 1,
          newDate: new Date('2027-10-05'),
          newPair: 2,
          sourceContext: { id: 'event-1', version: 1 },
        },
      ],
    };

    tx.timetableRescheduleRequest.findUnique.mockResolvedValue(requestRecord);
    Object.assign(tx, {
      timetableEvent: {
        findMany: jest.fn().mockResolvedValue([{ id: 'event-1', version: 2 }]),
      },
    });

    await expect(service.approve('request-1', 'admin-1')).rejects.toThrow(
      ConflictException,
    );
    expect(rescheduling.apply).not.toHaveBeenCalled();
  });

  it.each([new BadRequestException('stale'), new ForbiddenException('stale')])(
    'turns a stale proposal failure on approval into a 409',
    async (failure) => {
      tx.timetableRescheduleRequest.findUnique.mockResolvedValue({
        id: 'request-1',
        requesterId: 'teacher-1',
        eventId: 'event-1',
        newDate: new Date('2027-10-05'),
        newPair: 2,
        scope: 'ONCE',
        reason: 'Conference',
        status: 'PENDING',
        createdAt: new Date('2027-10-01T00:00:00Z'),
        decidedAt: null,
        decisionExplanation: null,
        requester: { name: 'Teacher' },
        event: {
          disciplineTitleSnapshot: 'Calculus',
          teachingAssignment: { disciplineTitle: 'Calculus' },
        },
        occurrences: [
          {
            eventId: 'event-1',
            oldDate: new Date('2027-10-04'),
            oldPair: 1,
            newDate: new Date('2027-10-05'),
            newPair: 2,
            sourceContext: { id: 'event-1' },
          },
        ],
      });
      Object.assign(tx, {
        timetableEvent: {
          findMany: jest.fn().mockResolvedValue([{ id: 'event-1' }]),
        },
      });
      rescheduling.buildProposal.mockRejectedValue(failure);

      await expect(service.approve('request-1', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
      expect(rescheduling.apply).not.toHaveBeenCalled();
    },
  );

  it('creates a pending request with occurrence snapshots without mutating events', async () => {
    const input = {
      eventId: 'event-1',
      newDate: '2027-10-05',
      newPair: 2,
      scope: 'ONCE' as const,
      reason: 'Conference',
    };
    const created = {
      id: 'req-new',
      requesterId: 'teacher-1',
      ...input,
      newDate: new Date('2027-10-05'),
      status: 'PENDING',
      createdAt: new Date('2027-10-01T00:00:00Z'),
      decidedAt: null,
      decisionExplanation: null,
      requester: { name: 'Teacher' },
      event: {
        disciplineTitleSnapshot: 'Calculus',
        teachingAssignment: { disciplineTitle: 'Calculus' },
      },
      occurrences: [
        {
          eventId: 'event-1',
          oldDate: new Date('2027-10-04'),
          oldPair: 1,
          newDate: new Date('2027-10-05'),
          newPair: 2,
          sourceContext: { id: 'event-1' },
        },
      ],
    };

    rescheduling.buildProposal.mockResolvedValue({
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
    Object.assign(tx, {
      timetableEvent: {
        findMany: jest.fn().mockResolvedValue([{ id: 'event-1' }]),
      },
    });
    tx.timetableRescheduleRequest.create.mockResolvedValue(created);

    const response = await service.create('teacher-1', input);

    expect(response.status).toBe('PENDING');
    expect(rescheduling.apply).not.toHaveBeenCalled();
  });

  it('lists requests scoped by instructor or for admin review with pagination', async () => {
    await expect(service.listMine('non-teacher', {})).rejects.toThrow(
      ForbiddenException,
    );

    tx.user.findUnique.mockResolvedValue({ roles: ['INSTRUCTOR'] });
    tx.timetableRescheduleRequest.findMany.mockResolvedValue([]);
    tx.timetableRescheduleRequest.count.mockResolvedValue(0);

    await expect(
      service.listMine('teacher-1', {
        page: 2,
        pageSize: 10,
        status: 'PENDING',
      }),
    ).resolves.toEqual({ items: [], total: 0, page: 2, pageSize: 10 });

    await expect(service.listForReview({})).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });
});
