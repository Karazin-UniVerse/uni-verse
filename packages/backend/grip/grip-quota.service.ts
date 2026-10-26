import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GRIP_LEASE_TTL_MS,
  GRIP_MAX_CONCURRENT_CALLS,
  GRIP_QUOTA_EXCHANGE_GLOBAL_PER_MINUTE,
  GRIP_QUOTA_EXCHANGE_IP_PER_MINUTE,
  GRIP_QUOTA_GLOBAL_PER_DAY,
  GRIP_QUOTA_USER_PER_DAY,
  GRIP_QUOTA_USER_PER_MINUTE,
} from './grip.constants';

const ADVISORY_LOCK_SQL = 'SELECT pg_advisory_xact_lock(48291, 84729);';
const MAX_SERIALIZATION_RETRIES = 3;

function getMinuteWindow(date: Date): {
  windowKey: string;
  windowEndsAt: Date;
} {
  const currentMs = date.getTime();
  const windowStartMs = Math.floor(currentMs / 60_000) * 60_000;
  const windowEndsAt = new Date(windowStartMs + 60_000);
  const windowKey = String(windowStartMs);

  return { windowKey, windowEndsAt };
}

function getUtcDayWindow(date: Date): {
  windowKey: string;
  windowEndsAt: Date;
} {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dayKey = `${year}-${month}-${day}`;
  const nextDayUtcMs = Date.UTC(
    year,
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  );
  const windowEndsAt = new Date(nextDayUtcMs);

  return { windowKey: dayKey, windowEndsAt };
}

@Injectable()
export class GripQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;

    while (attempt < MAX_SERIALIZATION_RETRIES) {
      try {
        return await operation();
      } catch (error: unknown) {
        const isSerializationConflict =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: string }).code === 'P2034';

        if (
          isSerializationConflict &&
          attempt < MAX_SERIALIZATION_RETRIES - 1
        ) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, attempt * 50));
          continue;
        }

        throw error;
      }
    }

    return operation();
  }

  async reserveSessionExchange(ip: string): Promise<void> {
    await this.executeWithRetry(async () => {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(ADVISORY_LOCK_SQL);

        const now = new Date();

        await tx.gripQuotaBucket.deleteMany({
          where: {
            windowEndsAt: { lt: now },
          },
        });

        const minuteWindow = getMinuteWindow(now);
        const ipKey = `exchange:ip:${ip}:${minuteWindow.windowKey}`;
        const globalKey = `exchange:global:${minuteWindow.windowKey}`;

        const ipBucket = await tx.gripQuotaBucket.findUnique({
          where: { key: ipKey },
        });

        if ((ipBucket?.count ?? 0) >= GRIP_QUOTA_EXCHANGE_IP_PER_MINUTE) {
          throw new HttpException(
            'Session exchange rate limit exceeded for IP',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const globalBucket = await tx.gripQuotaBucket.findUnique({
          where: { key: globalKey },
        });

        if (
          (globalBucket?.count ?? 0) >= GRIP_QUOTA_EXCHANGE_GLOBAL_PER_MINUTE
        ) {
          throw new HttpException(
            'Global session exchange rate limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        await tx.gripQuotaBucket.upsert({
          where: { key: ipKey },
          create: {
            key: ipKey,
            windowEndsAt: minuteWindow.windowEndsAt,
            count: 1,
          },
          update: {
            count: { increment: 1 },
          },
        });

        await tx.gripQuotaBucket.upsert({
          where: { key: globalKey },
          create: {
            key: globalKey,
            windowEndsAt: minuteWindow.windowEndsAt,
            count: 1,
          },
          update: {
            count: { increment: 1 },
          },
        });
      });
    });
  }

  async reserveCompletion(githubId: string): Promise<{ leaseId: string }> {
    return this.executeWithRetry(async () => {
      return this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(ADVISORY_LOCK_SQL);

        const now = new Date();

        await tx.gripLease.deleteMany({
          where: {
            expiresAt: { lt: now },
          },
        });

        await tx.gripQuotaBucket.deleteMany({
          where: {
            windowEndsAt: { lt: now },
          },
        });

        const activeLeaseCount = await tx.gripLease.count({
          where: {
            expiresAt: { gte: now },
          },
        });

        if (activeLeaseCount >= GRIP_MAX_CONCURRENT_CALLS) {
          throw new HttpException(
            'Concurrent request limit reached',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const minuteWindow = getMinuteWindow(now);
        const utcDayWindow = getUtcDayWindow(now);

        const userMinKey = `completion:user:min:${githubId}:${minuteWindow.windowKey}`;
        const userDayKey = `completion:user:day:${githubId}:${utcDayWindow.windowKey}`;
        const globalDayKey = `completion:global:day:${utcDayWindow.windowKey}`;

        const userMinBucket = await tx.gripQuotaBucket.findUnique({
          where: { key: userMinKey },
        });

        if ((userMinBucket?.count ?? 0) >= GRIP_QUOTA_USER_PER_MINUTE) {
          throw new HttpException(
            'User minute completion limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const userDayBucket = await tx.gripQuotaBucket.findUnique({
          where: { key: userDayKey },
        });

        if ((userDayBucket?.count ?? 0) >= GRIP_QUOTA_USER_PER_DAY) {
          throw new HttpException(
            'User daily completion limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const globalDayBucket = await tx.gripQuotaBucket.findUnique({
          where: { key: globalDayKey },
        });

        if ((globalDayBucket?.count ?? 0) >= GRIP_QUOTA_GLOBAL_PER_DAY) {
          throw new HttpException(
            'Global daily completion limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        await tx.gripQuotaBucket.upsert({
          where: { key: userMinKey },
          create: {
            key: userMinKey,
            windowEndsAt: minuteWindow.windowEndsAt,
            count: 1,
          },
          update: {
            count: { increment: 1 },
          },
        });

        await tx.gripQuotaBucket.upsert({
          where: { key: userDayKey },
          create: {
            key: userDayKey,
            windowEndsAt: utcDayWindow.windowEndsAt,
            count: 1,
          },
          update: {
            count: { increment: 1 },
          },
        });

        await tx.gripQuotaBucket.upsert({
          where: { key: globalDayKey },
          create: {
            key: globalDayKey,
            windowEndsAt: utcDayWindow.windowEndsAt,
            count: 1,
          },
          update: {
            count: { increment: 1 },
          },
        });

        const expiresAt = new Date(now.getTime() + GRIP_LEASE_TTL_MS);
        const lease = await tx.gripLease.create({
          data: {
            expiresAt,
          },
        });

        return { leaseId: lease.id };
      });
    });
  }

  async releaseCompletion(leaseId: string): Promise<void> {
    await this.prisma.gripLease.deleteMany({
      where: { id: leaseId },
    });
  }
}
