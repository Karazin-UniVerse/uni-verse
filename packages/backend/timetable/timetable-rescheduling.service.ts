import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@universe/database';
import type {
  ReschedulePreviewResponse,
  RescheduleProposalInput,
} from '@universe/core/types/timetable';
import { buildRescheduleChanges } from '@universe/core/utils/timetable-rescheduling';
import { checkTimetableConflicts } from '@universe/core/utils/timetable';
import { TIMETABLE_SOFT_PENALTY_CODE } from '@universe/core/constants/timetable';
import { PrismaService } from '../prisma/prisma.service';
import { lockTimetableWrites } from './timetable-write-lock';
import { getPrismaErrorCode } from '../utils/prisma-error';
import { PRISMA_ERROR_CODE } from '../constants/prisma';
import {
  toScheduledEvent,
  parseMakeupSaturdays,
  parseMakeupSaturdayDates,
  toIsoDateString,
} from './timetable.helpers';

const EVENT_CONTEXT_INCLUDE = {
  teachingAssignment: {
    include: {
      group: true,
      subgroup: true,
      stream: { include: { groups: true } },
    },
  },
  timetableVersion: { include: { semesterCalendar: true } },
} as const;

@Injectable()
export class TimetableReschedulingService {
  constructor(private readonly prisma: PrismaService) {}

  async reschedule(
    input: RescheduleProposalInput,
    actorId: string,
  ): Promise<ReschedulePreviewResponse> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await lockTimetableWrites(tx);
          const proposal = await this.buildProposal({
            tx,
            input,
            actorId,
            mode: 'ADMIN',
          });

          await this.apply({ tx, proposal, actorId, reason: input.reason });

          return proposal;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        getPrismaErrorCode(error) === PRISMA_ERROR_CODE.TRANSACTION_CONFLICT
      ) {
        throw new ConflictException(
          'Timetable changed concurrently; retry the operation',
        );
      }

      throw error;
    }
  }

  async apply({
    tx,
    proposal,
    actorId,
    reason,
    requestId,
  }: {
    tx: Prisma.TransactionClient;
    proposal: ReschedulePreviewResponse;
    actorId: string;
    reason: string;
    requestId?: string;
  }): Promise<void> {
    for (const change of proposal.changes) {
      await tx.timetableEvent.update({
        where: { id: change.eventId },
        data: { date: new Date(change.newDate), pair: change.newPair },
      });
    }

    await tx.timetableRescheduleAudit.createMany({
      data: proposal.changes.map((change) => ({
        ...change,
        oldDate: new Date(change.oldDate),
        newDate: new Date(change.newDate),
        actorId,
        reason,
        requestId,
      })),
    });
  }

  async preview(
    input: RescheduleProposalInput,
    actorId: string,
    mode: 'INSTRUCTOR' | 'ADMIN',
  ): Promise<ReschedulePreviewResponse> {
    return this.prisma.$transaction(
      async (tx) => {
        return this.buildProposal({ tx, input, actorId, mode });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async buildProposal({
    tx,
    input,
    actorId,
    mode,
  }: {
    tx: Prisma.TransactionClient;
    input: RescheduleProposalInput;
    actorId: string;
    mode: 'INSTRUCTOR' | 'ADMIN';
  }): Promise<ReschedulePreviewResponse> {
    const actor = await tx.user.findUnique({
      where: { id: actorId },
      select: { roles: true },
    });
    const requiredRole = mode === 'ADMIN' ? Role.ADMIN : Role.INSTRUCTOR;

    if (!actor?.roles.includes(requiredRole)) {
      throw new ForbiddenException('Insufficient rescheduling permissions');
    }

    const selected = await tx.timetableEvent.findUnique({
      where: { id: input.eventId },
      include: EVENT_CONTEXT_INCLUDE,
    });

    if (!selected) {
      throw new NotFoundException('Timetable event not found');
    }

    if (
      mode === 'INSTRUCTOR' &&
      (selected.teacherIdSnapshot ?? selected.teachingAssignment.teacherId) !==
        actorId
    ) {
      throw new ForbiddenException(
        'Only the assigned instructor can request rescheduling',
      );
    }

    if (
      selected.isCancelled ||
      selected.timetableVersion.status !== 'PUBLISHED'
    ) {
      throw new BadRequestException(
        'Only active published events can be rescheduled',
      );
    }

    const calendar = selected.timetableVersion.semesterCalendar;
    const versionEvents = await tx.timetableEvent.findMany({
      where: {
        timetableVersionId: selected.timetableVersionId,
        isCancelled: false,
      },
      include: EVENT_CONTEXT_INCLUDE,
    });
    const makeupSaturdays = parseMakeupSaturdays(calendar);
    const makeupDates = new Set(makeupSaturdays.map((entry) => entry.date));
    const result = buildRescheduleChanges({
      eventId: selected.id,
      events: versionEvents.map((event) =>
        toScheduledEvent(event, makeupDates),
      ),
      newDate: input.newDate,
      newPair: input.newPair,
      scope: input.scope,
      calendar: {
        startDate: toIsoDateString(calendar.startDate),
        teachingWeeks: calendar.teachingWeeks,
        excludedDates: Array.isArray(calendar.excludedDates)
          ? calendar.excludedDates.filter(
              (date): date is string => typeof date === 'string',
            )
          : [],
        makeupSaturdays,
      },
      now: new Date(),
    });

    if (!result.ok) {
      throw new BadRequestException({
        message: 'Invalid rescheduling proposal',
        code: result.error,
      });
    }

    const changes = new Map(
      result.changes.map((change) => [change.eventId, change]),
    );
    const affectedDates = [
      ...new Set(
        result.changes.flatMap((change) => [change.oldDate, change.newDate]),
      ),
    ].map((date) => new Date(date));
    const occupancy = await tx.timetableEvent.findMany({
      where: {
        isCancelled: false,
        timetableVersion: { status: 'PUBLISHED' },
        OR: [
          { date: { in: affectedDates } },
          {
            timetableVersion: {
              semesterCalendarId: selected.timetableVersion.semesterCalendarId,
            },
          },
        ],
      },
      include: EVENT_CONTEXT_INCLUDE,
    });
    const proposed = occupancy.map((event) => {
      const change = changes.get(event.id);
      const scheduled = toScheduledEvent(
        event,
        parseMakeupSaturdayDates(event.timetableVersion.semesterCalendar),
      );

      return change
        ? {
            ...scheduled,
            date: change.newDate,
            pair: change.newPair,
            isMakeupSaturday: makeupDates.has(change.newDate),
          }
        : scheduled;
    });
    const unavailability = await tx.teacherUnavailability.findMany({
      where: { isConfirmed: true },
    });
    const report = checkTimetableConflicts({
      events: proposed,
      unavailability: unavailability.map((entry) => ({
        ...entry,
        date: toIsoDateString(entry.date),
      })),
    });
    const conflicts = report.hardConflicts.filter((conflict) =>
      conflict.eventIds.some((id) => changes.has(id)),
    );
    const baseline = checkTimetableConflicts({
      events: occupancy.map((event) =>
        toScheduledEvent(
          event,
          parseMakeupSaturdayDates(event.timetableVersion.semesterCalendar),
        ),
      ),
    });
    const existingPrecedence = new Set(
      baseline.softPenalties
        .filter(
          (penalty) =>
            penalty.code ===
            TIMETABLE_SOFT_PENALTY_CODE.PRACTICE_BEFORE_LECTURE,
        )
        .flatMap((penalty) => penalty.eventIds),
    );
    const precedence = report.softPenalties.filter(
      (penalty) =>
        penalty.code === TIMETABLE_SOFT_PENALTY_CODE.PRACTICE_BEFORE_LECTURE &&
        penalty.eventIds.some(
          (id) => changes.has(id) || !existingPrecedence.has(id),
        ),
    );

    if (conflicts.length > 0 || precedence.length > 0) {
      throw new ConflictException({
        message: 'Rescheduling creates timetable conflicts',
        conflicts,
        precedence,
      });
    }

    return { changes: result.changes };
  }
}
