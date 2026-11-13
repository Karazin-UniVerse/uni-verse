import { isDeepStrictEqual } from 'node:util';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@universe/database';
import type {
  ListRescheduleRequestsQuery,
  RescheduleProposalInput,
  RescheduleRequestPage,
  RescheduleRequestResponse,
} from '@universe/core/types/timetable';
import { DEFAULT_RESCHEDULE_PAGE_SIZE } from '@universe/core/constants/timetable';
import { PRISMA_ERROR_CODE } from '../constants/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { getPrismaErrorCode } from '../utils/prisma-error';
import { lockTimetableWrites } from './timetable-write-lock';
import { TimetableReschedulingService } from './timetable-rescheduling.service';
import { toIsoDateString } from './timetable.helpers';

const REQUEST_INCLUDE = {
  requester: { select: { name: true } },
  event: {
    select: {
      disciplineTitleSnapshot: true,
      teachingAssignment: { select: { disciplineTitle: true } },
    },
  },
  occurrences: { orderBy: [{ oldDate: 'asc' }, { eventId: 'asc' }] },
} satisfies Prisma.TimetableRescheduleRequestInclude;

type RequestRecord = Prisma.TimetableRescheduleRequestGetPayload<{
  include: typeof REQUEST_INCLUDE;
}>;

function toResponse(record: RequestRecord): RescheduleRequestResponse {
  return {
    id: record.id,
    eventId: record.eventId,
    newDate: toIsoDateString(record.newDate),
    newPair: record.newPair,
    scope: record.scope,
    reason: record.reason,
    status: record.status,
    requesterName: record.requester.name ?? '',
    disciplineTitle:
      record.event.disciplineTitleSnapshot ??
      record.event.teachingAssignment.disciplineTitle,
    createdAt: record.createdAt.toISOString(),
    decidedAt: record.decidedAt?.toISOString() ?? null,
    decisionExplanation: record.decisionExplanation,
    changes: record.occurrences.map((entry) => ({
      eventId: entry.eventId,
      oldDate: toIsoDateString(entry.oldDate),
      oldPair: entry.oldPair,
      newDate: toIsoDateString(entry.newDate),
      newPair: entry.newPair,
    })),
  };
}

async function sourceContext(
  tx: Prisma.TransactionClient,
  eventIds: string[],
): Promise<Map<string, Prisma.InputJsonValue>> {
  const events = await tx.timetableEvent.findMany({
    where: { id: { in: eventIds } },
    select: {
      id: true,
      date: true,
      pair: true,
      pairSpan: true,
      isCancelled: true,
      timetableVersionId: true,
      teachingAssignmentId: true,
      teacherIdSnapshot: true,
      teachingTypeSnapshot: true,
      timetableVersion: {
        select: {
          status: true,
          semesterCalendarId: true,
          semesterCalendar: true,
        },
      },
      teachingAssignment: {
        select: {
          teacherId: true,
          teachingType: true,
          groupId: true,
          subgroupId: true,
          streamId: true,
          isSaturdayOnly: true,
          hasLateSlotAuthorization: true,
          subgroup: { select: { academicGroupId: true } },
          stream: {
            select: {
              groups: { select: { id: true }, orderBy: { id: 'asc' } },
            },
          },
        },
      },
    },
  });

  return new Map(
    events.map((event) => [
      event.id,
      JSON.parse(JSON.stringify(event)) as Prisma.InputJsonValue,
    ]),
  );
}

@Injectable()
export class TimetableRescheduleRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rescheduling: TimetableReschedulingService,
  ) {}

  async create(
    userId: string,
    input: RescheduleProposalInput,
  ): Promise<RescheduleRequestResponse> {
    return this.prisma.$transaction(
      async (tx) => {
        const proposal = await this.rescheduling.buildProposal({
          tx,
          input,
          actorId: userId,
          mode: 'INSTRUCTOR',
        });
        const context = await sourceContext(
          tx,
          proposal.changes.map((change) => change.eventId),
        );
        const record = await tx.timetableRescheduleRequest.create({
          data: {
            ...input,
            newDate: new Date(input.newDate),
            requesterId: userId,
            occurrences: {
              create: proposal.changes.map((change) => ({
                ...change,
                oldDate: new Date(change.oldDate),
                newDate: new Date(change.newDate),
                sourceContext: context.get(change.eventId)!,
              })),
            },
          },
          include: REQUEST_INCLUDE,
        });

        return toResponse(record);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async listMine(
    userId: string,
    query: ListRescheduleRequestsQuery,
  ): Promise<RescheduleRequestPage> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user?.roles.includes(Role.INSTRUCTOR)) {
      throw new ForbiddenException('Instructor role required');
    }

    return this.list(
      {
        requesterId: userId,
        ...(query.status ? { status: query.status } : {}),
      },
      query,
    );
  }

  async listForReview(
    query: ListRescheduleRequestsQuery,
  ): Promise<RescheduleRequestPage> {
    return this.list(query.status ? { status: query.status } : {}, query);
  }

  private async list(
    where: Prisma.TimetableRescheduleRequestWhereInput,
    query: ListRescheduleRequestsQuery,
  ): Promise<RescheduleRequestPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_RESCHEDULE_PAGE_SIZE;
    const [records, total] = await this.prisma.$transaction([
      this.prisma.timetableRescheduleRequest.findMany({
        where,
        include: REQUEST_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.timetableRescheduleRequest.count({ where }),
    ]);

    return { items: records.map(toResponse), total, page, pageSize };
  }

  async approve(
    requestId: string,
    reviewerId: string,
  ): Promise<RescheduleRequestResponse> {
    return this.decide({ requestId, reviewerId, approve: true });
  }

  async reject(
    requestId: string,
    reviewerId: string,
    explanation: string,
  ): Promise<RescheduleRequestResponse> {
    return this.decide({ requestId, reviewerId, approve: false, explanation });
  }

  private async decide({
    requestId,
    reviewerId,
    approve,
    explanation,
  }: {
    requestId: string;
    reviewerId: string;
    approve: boolean;
    explanation?: string;
  }): Promise<RescheduleRequestResponse> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const actor = await tx.user.findUnique({
            where: { id: reviewerId },
            select: { roles: true },
          });

          if (!actor?.roles.includes(Role.ADMIN)) {
            throw new ForbiddenException('Administrator role required');
          }

          await lockTimetableWrites(tx);
          await tx.$queryRaw`SELECT "id" FROM "TimetableRescheduleRequest" WHERE "id" = ${requestId} FOR UPDATE`;
          const request = await tx.timetableRescheduleRequest.findUnique({
            where: { id: requestId },
            include: REQUEST_INCLUDE,
          });

          if (!request) {
            throw new NotFoundException('Rescheduling request not found');
          }

          if (request.status !== 'PENDING') {
            throw new ConflictException('Request already decided');
          }

          if (approve) {
            const original = toResponse(request);
            const context = await sourceContext(
              tx,
              original.changes.map((change) => change.eventId),
            );

            if (
              request.occurrences.some(
                (entry) =>
                  !isDeepStrictEqual(
                    context.get(entry.eventId),
                    entry.sourceContext,
                  ),
              )
            ) {
              throw new ConflictException(
                'Source events changed; submit a new request',
              );
            }

            let proposal: Awaited<
              ReturnType<TimetableReschedulingService['buildProposal']>
            >;

            try {
              proposal = await this.rescheduling.buildProposal({
                tx,
                input: original,
                actorId: request.requesterId,
                mode: 'INSTRUCTOR',
              });
            } catch (proposalError) {
              if (
                proposalError instanceof BadRequestException ||
                proposalError instanceof ForbiddenException
              ) {
                throw new ConflictException(
                  'Rescheduling request can no longer be applied',
                );
              }

              throw proposalError;
            }

            if (
              JSON.stringify(proposal.changes) !==
              JSON.stringify(original.changes)
            ) {
              throw new ConflictException(
                'Series changed; submit a new request',
              );
            }

            await this.rescheduling.apply({
              tx,
              proposal,
              actorId: reviewerId,
              reason: request.reason,
              requestId,
            });
          }

          const updated = await tx.timetableRescheduleRequest.update({
            where: { id: requestId },
            data: {
              status: approve ? 'APPROVED' : 'REJECTED',
              reviewerId,
              decidedAt: new Date(),
              decisionExplanation: explanation ?? null,
            },
            include: REQUEST_INCLUDE,
          });

          return toResponse(updated);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        getPrismaErrorCode(error) === PRISMA_ERROR_CODE.TRANSACTION_CONFLICT
      ) {
        throw new ConflictException(
          'Timetable changed concurrently; retry the decision',
        );
      }

      throw error;
    }
  }
}
