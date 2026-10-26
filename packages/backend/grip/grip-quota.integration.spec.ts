import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@universe/database';
import { GripQuotaService } from './grip-quota.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('GripQuotaService (PostgreSQL integration)', () => {
  const testDbUrl = process.env.GRIP_TEST_DATABASE_URL;

  if (!testDbUrl) {
    it('fails when GRIP_TEST_DATABASE_URL is absent', () => {
      throw new Error(
        'GRIP_TEST_DATABASE_URL is not set. A dedicated disposable PostgreSQL database is required for integration tests.',
      );
    });

    return;
  }

  let client1: PrismaClient;
  let client2: PrismaClient;
  let service1: GripQuotaService;
  let service2: GripQuotaService;

  beforeAll(async () => {
    const adapter1 = new PrismaPg({ connectionString: testDbUrl });
    const adapter2 = new PrismaPg({ connectionString: testDbUrl });

    client1 = new PrismaClient({ adapter: adapter1 });
    client2 = new PrismaClient({ adapter: adapter2 });
    await client1.$connect();
    await client2.$connect();
    service1 = new GripQuotaService(client1 as unknown as PrismaService);
    service2 = new GripQuotaService(client2 as unknown as PrismaService);
  });

  afterAll(async () => {
    await client1.$disconnect();
    await client2.$disconnect();
  });

  beforeEach(async () => {
    await client1.gripLease.deleteMany();
    await client1.gripQuotaBucket.deleteMany();
  });

  it('allows at most two live concurrent leases across two client instances', async () => {
    const lease1 = await service1.reserveCompletion('1001');
    const lease2 = await service2.reserveCompletion('1002');

    expect(lease1.leaseId).toBeDefined();
    expect(lease2.leaseId).toBeDefined();

    await expect(service1.reserveCompletion('1003')).rejects.toThrow();

    await service1.releaseCompletion(lease1.leaseId);
    const lease3 = await service2.reserveCompletion('1003');

    expect(lease3.leaseId).toBeDefined();
  });

  it('reclaims expired leases automatically upon next admission', async () => {
    await client1.gripLease.create({
      data: {
        expiresAt: new Date(Date.now() - 5000),
      },
    });
    await client1.gripLease.create({
      data: {
        expiresAt: new Date(Date.now() - 3000),
      },
    });

    const lease1 = await service1.reserveCompletion('2001');
    const lease2 = await service2.reserveCompletion('2002');

    expect(lease1.leaseId).toBeDefined();
    expect(lease2.leaseId).toBeDefined();
  });

  it('shares rate limits for one user identity across different clients/sessions', async () => {
    for (let i = 0; i < 5; i++) {
      const lease = await service1.reserveCompletion('user-shared');

      await service1.releaseCompletion(lease.leaseId);
    }

    for (let i = 0; i < 5; i++) {
      const lease = await service2.reserveCompletion('user-shared');

      await service2.releaseCompletion(lease.leaseId);
    }

    await expect(service1.reserveCompletion('user-shared')).rejects.toThrow();
  });
});
