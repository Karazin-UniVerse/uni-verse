import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GripHostedCleanupService {
  constructor(private readonly prisma: PrismaService) {}

  async cleanupExpiredHostedData({
    now,
    batchSize,
  }: {
    now: Date;
    batchSize: number;
  }): Promise<{
    contentDeleted: number;
    checksDeleted: number;
    intentsDeleted: number;
    sessionsDeleted: number;
    oauthDeleted: number;
    complete: boolean;
  }> {
    if (
      !Number.isInteger(batchSize) ||
      batchSize < 1 ||
      batchSize > 100 ||
      !Number.isFinite(now.getTime())
    ) {
      throw new BadRequestException('Invalid hosted cleanup batch');
    }

    const contentWhere = { purgeAt: { lte: now } };
    const contents = await this.prisma.gripHostedContent.findMany({
      where: contentWhere,
      select: { checkId: true },
      take: batchSize,
      orderBy: { purgeAt: 'asc' },
    });
    const contentDeleted = contents.length
      ? (
          await this.prisma.gripHostedContent.deleteMany({
            where: {
              ...contentWhere,
              checkId: { in: contents.map((content) => content.checkId) },
            },
          })
        ).count
      : 0;
    const expiredCheckWhere = {
      state: { in: ['CREATED', 'GENERATING', 'READY', 'GRADING'] },
      expiresAt: { lte: now },
    };
    const expiredChecks = await this.prisma.gripHostedCheck.findMany({
      where: expiredCheckWhere,
      select: { id: true },
      take: batchSize,
      orderBy: { expiresAt: 'asc' },
    });

    if (expiredChecks.length) {
      await this.prisma.gripHostedCheck.updateMany({
        where: {
          ...expiredCheckWhere,
          id: { in: expiredChecks.map((check) => check.id) },
        },
        data: {
          state: 'EXPIRED',
          reason: null,
          operationId: null,
          operationDeadline: null,
        },
      });
    }

    const staleCheckWhere = {
      state: { in: ['GENERATING', 'GRADING'] },
      expiresAt: { gt: now },
      operationDeadline: { lte: now },
    };
    const staleChecks = await this.prisma.gripHostedCheck.findMany({
      where: staleCheckWhere,
      select: { id: true },
      take: batchSize,
      orderBy: { operationDeadline: 'asc' },
    });

    if (staleChecks.length) {
      await this.prisma.gripHostedCheck.updateMany({
        where: {
          ...staleCheckWhere,
          id: { in: staleChecks.map((check) => check.id) },
        },
        data: {
          state: 'TECHNICAL_ERROR',
          reason: 'OPERATION_FAILED',
          operationId: null,
          operationDeadline: null,
        },
      });
    }

    const checkWhere = { passValidUntil: { lte: now } };
    const checks = await this.prisma.gripHostedCheck.findMany({
      where: checkWhere,
      select: { id: true },
      take: batchSize,
      orderBy: { passValidUntil: 'asc' },
    });
    const checksDeleted = checks.length
      ? (
          await this.prisma.gripHostedCheck.deleteMany({
            where: {
              ...checkWhere,
              id: { in: checks.map((check) => check.id) },
            },
          })
        ).count
      : 0;
    const intentWhere = { replayUntil: { lte: now } };
    const intents = await this.prisma.gripHostedIntent.findMany({
      where: intentWhere,
      select: { id: true },
      take: batchSize,
      orderBy: { replayUntil: 'asc' },
    });
    const intentsDeleted = intents.length
      ? (
          await this.prisma.gripHostedIntent.deleteMany({
            where: {
              ...intentWhere,
              id: { in: intents.map((intent) => intent.id) },
            },
          })
        ).count
      : 0;
    const expiredWhere = { expiresAt: { lte: now } };
    const sessions = await this.prisma.gripBrowserSession.findMany({
      where: expiredWhere,
      select: { id: true },
      take: batchSize,
      orderBy: { expiresAt: 'asc' },
    });
    const sessionsDeleted = sessions.length
      ? (
          await this.prisma.gripBrowserSession.deleteMany({
            where: {
              ...expiredWhere,
              id: { in: sessions.map((session) => session.id) },
            },
          })
        ).count
      : 0;
    const transactions = await this.prisma.gripOAuthTransaction.findMany({
      where: expiredWhere,
      select: { id: true },
      take: batchSize,
      orderBy: { expiresAt: 'asc' },
    });
    const oauthDeleted = transactions.length
      ? (
          await this.prisma.gripOAuthTransaction.deleteMany({
            where: {
              ...expiredWhere,
              id: { in: transactions.map((transaction) => transaction.id) },
            },
          })
        ).count
      : 0;
    const remaining = await Promise.all([
      this.prisma.gripHostedContent.count({ where: contentWhere }),
      this.prisma.gripHostedCheck.count({ where: checkWhere }),
      this.prisma.gripHostedIntent.count({ where: intentWhere }),
      this.prisma.gripBrowserSession.count({ where: expiredWhere }),
      this.prisma.gripOAuthTransaction.count({ where: expiredWhere }),
      this.prisma.gripHostedCheck.count({ where: expiredCheckWhere }),
      this.prisma.gripHostedCheck.count({ where: staleCheckWhere }),
    ]);

    return {
      contentDeleted,
      checksDeleted,
      intentsDeleted,
      sessionsDeleted,
      oauthDeleted,
      complete: remaining.every((count) => count === 0),
    };
  }
}
