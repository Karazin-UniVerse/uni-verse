import { HttpException } from '@nestjs/common';
import { GripHostedRateLimitService } from '../grip-hosted-rate-limit.service';
import type { PrismaClient as PrismaService } from '@universe/database';

describe('hosted Grip shared request throttles', () => {
  it('should refuse the 61st read in the same window without consuming model quota', async () => {
    let count = 0;
    const transaction = {
      $executeRaw: jest.fn(),
      gripQuotaBucket: {
        findUnique: jest.fn(async () => ({ count })),
        upsert: jest.fn(async () => {
          count += 1;
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(transaction)),
    };
    const limiter = new GripHostedRateLimitService(prisma as unknown as PrismaService);

    for (let index = 0; index < 60; index += 1) {
      await limiter.reserveRead('session');
    }

    await expect(limiter.reserveRead('session')).rejects.toBeInstanceOf(HttpException);
    expect(count).toBe(60);
    expect(transaction.gripQuotaBucket.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          key: expect.stringContaining('hosted:read:'),
        }),
      }),
    );
  });
});
