import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@universe/database';
import { GripQuotaService } from '../grip-quota.service';
import type { PrismaService } from '../../prisma/prisma.service';

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

  it('allows at most two live concurrent leases across competing clients under parallel admission', async () => {
    const results = await Promise.allSettled([
      service1.reserveCompletion('1001'),
      service2.reserveCompletion('1002'),
      service1.reserveCompletion('1003'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(1);

    const succeededLease = (
      fulfilled[0] as PromiseFulfilledResult<{ leaseId: string }>
    ).value;

    await service1.releaseCompletion(succeededLease.leaseId);

    const newLease = await service2.reserveCompletion('1004');

    expect(newLease.leaseId).toBeDefined();
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

  it('enforces rate limits under parallel requests for the same user identity across clients', async () => {
    for (let i = 0; i < 9; i++) {
      const lease = await service1.reserveCompletion('user-shared');

      await service1.releaseCompletion(lease.leaseId);
    }

    const parallelResults = await Promise.allSettled([
      service1.reserveCompletion('user-shared').then(async (l) => {
        await service1.releaseCompletion(l.leaseId);

        return l;
      }),
      service2.reserveCompletion('user-shared').then(async (l) => {
        await service2.releaseCompletion(l.leaseId);

        return l;
      }),
      service1.reserveCompletion('user-shared').then(async (l) => {
        await service1.releaseCompletion(l.leaseId);

        return l;
      }),
    ]);

    const fulfilled = parallelResults.filter((r) => r.status === 'fulfilled');
    const rejected = parallelResults.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);
  });
});
