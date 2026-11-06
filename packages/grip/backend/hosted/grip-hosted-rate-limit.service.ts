import { createHash } from 'node:crypto';
import { Inject, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@universe/database';

const WINDOW_MS = 60_000;
const READ_LIMIT = 60;
const AUTH_START_LIMIT = 30;

@Injectable()
export class GripHostedRateLimitService {
  constructor(@Inject('GRIP_PRISMA') private readonly prisma: PrismaClient) {}

  async reserveRead(sessionId: string): Promise<void> {
    await this.reserve({ scope: 'read', actor: sessionId, limit: READ_LIMIT });
  }

  async reserveAuthStart(clientIp: string): Promise<void> {
    await this.reserve({
      scope: 'auth',
      actor: clientIp,
      limit: AUTH_START_LIMIT,
    });
  }

  private async reserve({
    scope,
    actor,
    limit,
  }: {
    scope: string;
    actor: string;
    limit: number;
  }): Promise<void> {
    const start = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
    const actorHash = createHash('sha256').update(actor).digest('hex');
    const key = `hosted:${scope}:${actorHash}:${start}`;

    await this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
      const bucket = await transaction.gripQuotaBucket.findUnique({
        where: { key },
      });

      if ((bucket?.count ?? 0) >= limit) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Hosted Grip request limit exceeded',
            retryAfter: Math.max(1, Math.ceil((start + WINDOW_MS - Date.now()) / 1_000)),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await transaction.gripQuotaBucket.upsert({
        where: { key },
        create: { key, windowEndsAt: new Date(start + WINDOW_MS), count: 1 },
        update: { count: { increment: 1 } },
      });
    });
  }
}
