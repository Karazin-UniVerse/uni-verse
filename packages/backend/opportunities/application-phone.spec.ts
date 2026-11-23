import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OpportunitiesService } from './opportunities.service';

describe('application phone ownership', () => {
  async function setup() {
    const users = new Map<string, string | null>([
      ['candidate-a', null],
      ['candidate-b', null],
    ]);
    const applications: {
      applicantId: string;
      contactInfo: string;
      opportunityId: string;
      status: string;
      id: string;
    }[] = [];
    const prisma = {
      opportunity: {
        findUnique: jest.fn(async ({ where }) => ({
          id: where.id,
          ownerId: 'owner',
          status: 'PUBLISHED',
          lifecycleState: 'ACTIVE',
          acceptsApplications: true,
          title: 'Research',
        })),
      },
      opportunityApplication: {
        findFirst: jest.fn(
          async ({ where }) =>
            applications.find(
              (app) =>
                app.applicantId === where.applicantId &&
                app.opportunityId === where.opportunityId,
            ) ?? null,
        ),
        create: jest.fn(async ({ data }) => {
          const app = { id: `application-${applications.length}`, ...data };

          applications.push(app);

          return app;
        }),
        update: jest.fn(async ({ where, data }) => {
          const app = applications.find((item) => item.id === where.id)!;

          Object.assign(app, data);

          return app;
        }),
      },
      userPhone: {
        upsert: jest.fn(async ({ where, create }) => {
          const current = users.get(where.userId);

          if (current) return { phoneNumber: current };

          if (
            [...users.entries()].some(
              ([id, phone]) =>
                id !== where.userId && phone === create.phoneNumber,
            )
          )
            throw { code: 'P2002', meta: { target: ['phoneNumber'] } };

          users.set(where.userId, create.phoneNumber);

          return { phoneNumber: create.phoneNumber };
        }),
      },
      notification: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(),
    };

    prisma.$transaction.mockImplementation(async (callback) => {
      const previousUsers = new Map(users);
      const previousApplications = applications.map((app) => ({ ...app }));

      try {
        return await callback(prisma);
      } catch (error) {
        users.clear();
        previousUsers.forEach((phone, id) => users.set(id, phone));
        applications.splice(0, applications.length, ...previousApplications);
        throw error;
      }
    });
    const module = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: NotificationsService,
          useValue: { createNotification: jest.fn() },
        },
      ],
    }).compile();

    return {
      service: module.get(OpportunitiesService),
      users,
      applications,
      prisma,
    };
  }

  const request = (contactInfo: string) => ({
    applicantName: 'Student',
    contactInfo,
  });

  it('allows the same account to submit different phone numbers across opportunities', async () => {
    const { service, applications } = await setup();

    await service.apply(
      'candidate-a',
      'opportunity-1',
      request('+380671234567'),
    );
    await service.apply(
      'candidate-a',
      'opportunity-2',
      request('+380501234567'),
    );

    expect(applications).toHaveLength(2);
    expect(applications[0].contactInfo).toBe('+380671234567');
    expect(applications[1].contactInfo).toBe('+380501234567');
  });

  it('allows different accounts to use the same phone number', async () => {
    const { service, applications } = await setup();

    await service.apply(
      'candidate-a',
      'opportunity-1',
      request('+380671234567'),
    );
    await service.apply('candidate-b', 'opportunity-2', request('0671234567'));

    expect(applications).toHaveLength(2);
  });

  it('allows changing the phone number when reapplying after withdrawal', async () => {
    const { service, applications } = await setup();

    await service.apply(
      'candidate-a',
      'opportunity-1',
      request('+380671234567'),
    );
    applications[0].status = 'WITHDRAWN';

    await service.apply(
      'candidate-a',
      'opportunity-1',
      request('+380501234567'),
    );

    expect(applications[0].status).toBe('SUBMITTED');
    expect(applications[0].contactInfo).toBe('+380501234567');
  });

  it('does not retain a phone claim when application creation fails', async () => {
    const { service, users, prisma } = await setup();

    prisma.opportunityApplication.create.mockRejectedValueOnce(
      new Error('Write failed'),
    );

    await expect(
      service.apply('candidate-a', 'opportunity-1', request('+380671234567')),
    ).rejects.toThrow('Write failed');
    expect(users.get('candidate-a')).toBeNull();
  });
});
