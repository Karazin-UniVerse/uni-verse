import { HttpException, HttpStatus } from '@nestjs/common';
import { GripQuotaService } from './grip-quota.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('GripQuotaService (unit)', () => {
  let service: GripQuotaService;
  let mockPrisma: any;
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      gripLease: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockResolvedValue({ id: 'lease-uuid-1', expiresAt: new Date() }),
      },
      gripQuotaBucket: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma = {
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) =>
        cb(mockTx),
      ),
      gripLease: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new GripQuotaService(mockPrisma as unknown as PrismaService);
  });

  it('allows completion admission under limits and creates lease', async () => {
    const result = await service.reserveCompletion('123456');

    expect(result).toHaveProperty('leaseId', 'lease-uuid-1');
    expect(mockTx.gripLease.create).toHaveBeenCalled();
    expect(mockTx.gripQuotaBucket.upsert).toHaveBeenCalledTimes(3);
  });

  it('rejects 3rd concurrent model call', async () => {
    mockTx.gripLease.count.mockResolvedValue(2);

    await expect(service.reserveCompletion('123456')).rejects.toThrow(
      new HttpException(
        'Concurrent request limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );

    expect(mockTx.gripLease.create).not.toHaveBeenCalled();
    expect(mockTx.gripQuotaBucket.upsert).not.toHaveBeenCalled();
  });

  it('rejects 11th call in a minute for the same user', async () => {
    mockTx.gripQuotaBucket.findUnique.mockImplementation(
      async ({ where }: { where: { key: string } }) => {
        if (where.key.startsWith('completion:user:min:123456:')) {
          return { key: where.key, count: 10, windowEndsAt: new Date() };
        }

        return null;
      },
    );

    await expect(service.reserveCompletion('123456')).rejects.toThrow(
      new HttpException(
        'User minute completion limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );

    expect(mockTx.gripLease.create).not.toHaveBeenCalled();
    expect(mockTx.gripQuotaBucket.upsert).not.toHaveBeenCalled();
  });

  it('rejects 101st call in a UTC day for the same user regardless of token', async () => {
    mockTx.gripQuotaBucket.findUnique.mockImplementation(
      async ({ where }: { where: { key: string } }) => {
        if (where.key.startsWith('completion:user:day:123456:')) {
          return { key: where.key, count: 100, windowEndsAt: new Date() };
        }

        return null;
      },
    );

    await expect(service.reserveCompletion('123456')).rejects.toThrow(
      new HttpException(
        'User daily completion limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );

    expect(mockTx.gripLease.create).not.toHaveBeenCalled();
  });

  it('rejects 501st call globally in a UTC day', async () => {
    mockTx.gripQuotaBucket.findUnique.mockImplementation(
      async ({ where }: { where: { key: string } }) => {
        if (where.key.startsWith('completion:global:day:')) {
          return { key: where.key, count: 500, windowEndsAt: new Date() };
        }

        return null;
      },
    );

    await expect(service.reserveCompletion('123456')).rejects.toThrow(
      new HttpException(
        'Global daily completion limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );

    expect(mockTx.gripLease.create).not.toHaveBeenCalled();
  });

  it('rejects session exchange when IP or global limits are exceeded', async () => {
    mockTx.gripQuotaBucket.findUnique.mockImplementation(
      async ({ where }: { where: { key: string } }) => {
        if (where.key.startsWith('exchange:ip:10.0.0.1:')) {
          return { key: where.key, count: 5, windowEndsAt: new Date() };
        }

        return null;
      },
    );

    await expect(service.reserveSessionExchange('10.0.0.1')).rejects.toThrow(
      new HttpException(
        'Session exchange rate limit exceeded for IP',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );

    expect(mockTx.gripQuotaBucket.upsert).not.toHaveBeenCalled();
  });

  it('releases completion lease idempotently', async () => {
    await service.releaseCompletion('lease-uuid-1');

    expect(mockPrisma.gripLease.deleteMany).toHaveBeenCalledWith({
      where: { id: 'lease-uuid-1' },
    });
  });
});
