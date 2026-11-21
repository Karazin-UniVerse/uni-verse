import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  OpportunityStatus,
  OpportunityTag,
  OpportunityLifecycleState,
  Role,
  type Prisma,
  type Opportunity,
} from '@universe/database';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('Opportunity favorites and restricted listings', () => {
  const opportunity: Opportunity & {
    owner: { id: string; name: string; email: string };
  } = {
    id: 'opportunity',
    ownerId: 'owner',
    title: 'Unreviewed title',
    description: 'Private revision',
    ownerContactInfo: '@private',
    paymentType: 'PAID',
    status: OpportunityStatus.READY_FOR_REVIEW,
    moderationComment: 'Private moderation feedback',
    lifecycleState: OpportunityLifecycleState.START,
    updatedAt: new Date('2026-10-01T10:00:00Z'),
    createdAt: new Date('2026-10-01T10:00:00Z'),
    acceptsApplications: true,
    partnerInfo: null,
    paymentDetails: null,
    details: null,
    moderationContentHash: null,
    tags: [],
    publishedAt: null,
    publishedTitle: null,
    publishedPaymentType: null,
    owner: { id: 'owner', name: 'Owner', email: 'private@example.com' },
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    opportunity: { findUnique: jest.fn(), update: jest.fn() },
    opportunityFavorite: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    opportunityApplication: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: OpportunitiesService;
  const notify = jest.fn();

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof prisma) => Promise<Opportunity>) =>
        callback(prisma),
    );
    const module = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: NotificationsService,
          useValue: { createNotification: notify },
        },
      ],
    }).compile();

    service = module.get(OpportunitiesService);
    prisma.opportunity.findUnique.mockResolvedValue(opportunity);
    prisma.user.findUnique.mockResolvedValue({ roles: [] });
  });

  it('rejects saving an owned opportunity', async () => {
    await expect(
      service.addFavorite('owner', opportunity.id),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.opportunityFavorite.createMany).not.toHaveBeenCalled();
  });

  it('rejects full detail access when a moderator claim is stale', async () => {
    await expect(
      service.findOne(opportunity.id, 'viewer', [Role.OPPORTUNITIES_MODERATOR]),
    ).rejects.toThrow(NotFoundException);
  });

  it.each([
    OpportunityStatus.DRAFT,
    OpportunityStatus.READY_FOR_REVIEW,
    OpportunityStatus.REJECTED,
  ])(
    'returns 404 for an anonymous viewer of a never-published %s opportunity',
    async (status) => {
      prisma.opportunity.findUnique.mockResolvedValue({
        ...opportunity,
        status,
      });

      await expect(service.getDetails(opportunity.id)).rejects.toThrow(
        NotFoundException,
      );
    },
  );

  it('returns a redacted detail preview with one opportunity read when a moderator claim is stale', async () => {
    prisma.opportunity.findUnique.mockResolvedValue({
      ...opportunity,
      publishedAt: opportunity.createdAt,
      publishedTitle: 'Published title',
    });
    await expect(
      service.getDetails(opportunity.id, 'viewer', [
        Role.OPPORTUNITIES_MODERATOR,
      ]),
    ).resolves.toEqual({
      id: opportunity.id,
      title: 'Published title',
      availability: 'temporary',
    });
    expect(prisma.opportunity.findUnique).toHaveBeenCalledTimes(1);
  });

  it('returns not found after one opportunity read for a missing detail', async () => {
    prisma.opportunity.findUnique.mockResolvedValue(null);

    await expect(service.getDetails('missing')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.opportunity.findUnique).toHaveBeenCalledTimes(1);
  });

  it('rejects newly saving an unpublished opportunity', async () => {
    await expect(
      service.addFavorite('viewer', opportunity.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('saves published opportunities idempotently', async () => {
    prisma.opportunity.findUnique.mockResolvedValue({
      ...opportunity,
      status: OpportunityStatus.PUBLISHED,
    });
    await service.addFavorite('viewer', opportunity.id);
    expect(prisma.opportunityFavorite.createMany).toHaveBeenCalledWith({
      data: {
        userId: 'viewer',
        opportunityId: opportunity.id,
      },
      skipDuplicates: true,
    });
  });

  it('removes a favorite without reading protected details', async () => {
    await service.removeFavorite('viewer', opportunity.id);
    expect(prisma.opportunityFavorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'viewer', opportunityId: opportunity.id },
    });
    expect(prisma.opportunity.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    OpportunityStatus.READY_FOR_REVIEW,
    OpportunityStatus.REQUIRES_CHANGES,
    OpportunityStatus.REJECTED,
  ])(
    'redacts %s favorites while retaining the safe snapshot',
    async (status) => {
      prisma.opportunityFavorite.findMany.mockResolvedValue([
        {
          opportunity: {
            ...opportunity,
            status,
            publishedTitle: 'Published title',
            publishedPaymentType: 'UNPAID',
          },
        },
      ]);
      const rows = await service.getFavorites('viewer');

      expect(rows).toEqual([
        {
          id: opportunity.id,
          title: 'Published title',
          paymentType: 'UNPAID',
          availability:
            status === OpportunityStatus.REJECTED ? 'permanent' : 'temporary',
        },
      ]);
      expect(JSON.stringify(rows)).not.toContain('Private');
      expect(JSON.stringify(rows)).not.toContain('@private');
    },
  );

  it('keeps the last published summary while redacting unpublished edits in My Applications', async () => {
    prisma.opportunityApplication.findMany.mockResolvedValue([
      {
        id: 'application',
        motivation: 'My motivation',
        opportunity: {
          ...opportunity,
          publishedTitle: 'Published title',
          publishedPaymentType: 'UNPAID',
        },
      },
    ]);
    const [application] = await service.getMyApplications('viewer');

    expect(application.opportunity).toEqual({
      id: opportunity.id,
      title: 'Published title',
      paymentType: 'UNPAID',
      availability: 'temporary',
    });
    expect(application.motivation).toBe('My motivation');
  });

  it('keeps moderator access to application opportunity details', async () => {
    prisma.user.findUnique.mockResolvedValue({
      roles: [Role.OPPORTUNITIES_MODERATOR],
    });
    prisma.opportunityApplication.findMany.mockResolvedValue([
      { id: 'application', opportunity },
    ]);
    const [application] = await service.getMyApplications('viewer', [
      Role.OPPORTUNITIES_MODERATOR,
    ]);

    expect(application.opportunity).toEqual(opportunity);
  });

  const initialTags = [OpportunityTag.RESEARCH, OpportunityTag.INTERNSHIP];

  it.each([
    {
      scenario: 'changed published tags',
      status: OpportunityStatus.PUBLISHED,
      tags: [OpportunityTag.RESEARCH],
      notifications: 1,
    },
    {
      scenario: 'identical tags',
      status: OpportunityStatus.PUBLISHED,
      tags: initialTags,
      notifications: 0,
    },
    {
      scenario: 'reordered tags',
      status: OpportunityStatus.PUBLISHED,
      tags: [...initialTags].reverse(),
      notifications: 0,
    },
    {
      scenario: 'unpublished changes',
      status: OpportunityStatus.READY_FOR_REVIEW,
      tags: [],
      notifications: 0,
    },
  ])(
    'sends $notifications favorite notifications for $scenario',
    async ({ status, tags, notifications }) => {
      const original = { ...opportunity, status, tags: initialTags };

      prisma.opportunity.findUnique.mockResolvedValue(original);
      prisma.opportunity.update.mockResolvedValue({ ...original, tags });
      prisma.opportunityFavorite.findMany.mockResolvedValue([
        { userId: 'subscriber' },
      ]);

      await service.update('owner', opportunity.id, { tags });

      expect(notify).toHaveBeenCalledTimes(notifications);
    },
  );

  it('notifies subscribers about published non-moderated changes', async () => {
    const published = {
      ...opportunity,
      status: OpportunityStatus.PUBLISHED,
      acceptsApplications: true,
    };

    prisma.opportunity.findUnique.mockResolvedValue(published);
    prisma.opportunity.update.mockResolvedValue({
      ...published,
      acceptsApplications: false,
    });
    prisma.opportunityFavorite.findMany.mockResolvedValue([
      { userId: 'subscriber' },
    ]);
    await service.update('owner', opportunity.id, {
      acceptsApplications: false,
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'subscriber',
        type: 'OPPORTUNITY_UPDATED',
        title: 'notifications.opportunityUpdated.title',
        message: JSON.stringify({ opportunityTitle: opportunity.title }),
        link: '/opportunities/opportunity',
      }),
    );
  });

  it.each(['update', 'lifecycle'] as const)(
    'notifies subscribers when %s closes applications in an already paused opportunity',
    async (operation) => {
      const paused = {
        ...opportunity,
        status: OpportunityStatus.PUBLISHED,
        lifecycleState: OpportunityLifecycleState.PAUSED,
        acceptsApplications: true,
      };

      prisma.opportunity.findUnique.mockResolvedValue(paused);
      prisma.opportunity.update.mockResolvedValue({
        ...paused,
        acceptsApplications: false,
      });
      prisma.opportunityFavorite.findMany.mockResolvedValue([
        { userId: 'subscriber' },
      ]);

      if (operation === 'update') {
        await service.update('owner', opportunity.id, {
          acceptsApplications: true,
        });
      } else {
        await service.changeLifecycleState(
          'owner',
          opportunity.id,
          OpportunityLifecycleState.PAUSED,
        );
      }

      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'subscriber',
          type: 'OPPORTUNITY_UPDATED',
        }),
      );
    },
  );

  it.each(['update', 'lifecycle'] as const)(
    'notifies each subscriber once when %s completes a published opportunity',
    async (operation) => {
      const published = {
        ...opportunity,
        status: OpportunityStatus.PUBLISHED,
        acceptsApplications: true,
      };
      const lifecycleState = OpportunityLifecycleState.COMPLETED;
      const subscribers = [
        { userId: 'subscriber-1' },
        { userId: 'subscriber-2' },
      ];

      prisma.opportunity.findUnique.mockResolvedValue(published);
      prisma.opportunity.update.mockResolvedValue({
        ...published,
        lifecycleState,
        acceptsApplications: false,
      });
      prisma.opportunityFavorite.findMany.mockResolvedValue(subscribers);

      if (operation === 'update') {
        await service.update('owner', opportunity.id, {
          lifecycleState,
          acceptsApplications: false,
        });
      } else {
        await service.changeLifecycleState(
          'owner',
          opportunity.id,
          lifecycleState,
        );
      }

      expect(notify).toHaveBeenCalledTimes(subscribers.length);

      for (const { userId } of subscribers) {
        expect(notify).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            type: 'OPPORTUNITY_UPDATED',
            message: JSON.stringify({
              opportunityTitle: published.title,
              lifecycleState,
            }),
          }),
        );
      }
    },
  );

  it('does not notify subscribers about unpublished edits', async () => {
    prisma.opportunity.update.mockResolvedValue(opportunity);
    await service.update('owner', opportunity.id, {
      acceptsApplications: false,
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it('does not expose revisions if a concurrent update returns an unpublished opportunity', async () => {
    prisma.opportunity.findUnique.mockResolvedValue({
      ...opportunity,
      status: OpportunityStatus.PUBLISHED,
      acceptsApplications: true,
    });
    prisma.opportunity.update.mockResolvedValue(opportunity);
    await service.update('owner', opportunity.id, {
      acceptsApplications: false,
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it('does not notify subscribers for a published no-op update', async () => {
    prisma.opportunity.findUnique.mockResolvedValue({
      ...opportunity,
      status: OpportunityStatus.PUBLISHED,
      acceptsApplications: true,
    });
    prisma.opportunity.update.mockResolvedValue(opportunity);
    await service.update('owner', opportunity.id, {
      acceptsApplications: true,
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it('notifies current subscribers after approval and refreshes the safe snapshot', async () => {
    prisma.user.findUnique.mockResolvedValue({
      roles: [Role.OPPORTUNITIES_MODERATOR],
    });
    prisma.opportunity.update.mockResolvedValue({
      ...opportunity,
      status: OpportunityStatus.PUBLISHED,
    });
    prisma.opportunityFavorite.findMany.mockResolvedValue([
      { userId: 'subscriber' },
    ]);
    await service.moderate('moderator', opportunity.id, { action: 'APPROVE' });
    expect(prisma.opportunity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publishedTitle: opportunity.title,
          publishedPaymentType: opportunity.paymentType,
        }),
      }),
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'subscriber',
        type: 'OPPORTUNITY_UPDATED',
        title: 'notifications.opportunityUpdated.title',
        message: JSON.stringify({ opportunityTitle: opportunity.title }),
        link: '/opportunities/opportunity',
      }),
    );
  });

  it('notifies subscribers even if the owner notification fails after approval', async () => {
    prisma.user.findUnique.mockResolvedValue({
      roles: [Role.OPPORTUNITIES_MODERATOR],
    });
    prisma.opportunity.update.mockResolvedValue({
      ...opportunity,
      status: OpportunityStatus.PUBLISHED,
    });
    prisma.opportunityFavorite.findMany.mockResolvedValue([
      { userId: 'subscriber' },
    ]);
    notify.mockRejectedValueOnce(new Error('Owner delivery unavailable'));
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    try {
      await service.moderate('moderator', opportunity.id, {
        action: 'APPROVE',
      });
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'subscriber',
          type: 'OPPORTUNITY_UPDATED',
          title: 'notifications.opportunityUpdated.title',
          message: JSON.stringify({ opportunityTitle: opportunity.title }),
          link: '/opportunities/opportunity',
        }),
      );
    } finally {
      log.mockRestore();
    }
  });

  it.each(['REJECT', 'REQUIRE_CHANGES'] as const)(
    'does not notify subscribers after %s',
    async (action) => {
      prisma.user.findUnique.mockResolvedValue({
        roles: [Role.OPPORTUNITIES_MODERATOR],
      });
      prisma.opportunity.update.mockResolvedValue(opportunity);
      await service.moderate('moderator', opportunity.id, {
        action,
        comment: 'Review feedback',
      });
      expect(prisma.opportunityFavorite.findMany).not.toHaveBeenCalled();
    },
  );

  it('does not fail an already completed update when subscriber delivery fails', async () => {
    const published = {
      ...opportunity,
      status: OpportunityStatus.PUBLISHED,
      acceptsApplications: true,
    };

    prisma.opportunity.findUnique.mockResolvedValue(published);
    prisma.opportunity.update.mockResolvedValue({
      ...published,
      acceptsApplications: false,
    });
    prisma.opportunityFavorite.findMany.mockResolvedValue([
      { userId: 'subscriber' },
    ]);
    notify.mockRejectedValueOnce(new Error('Delivery unavailable'));
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    try {
      await expect(
        service.update('owner', opportunity.id, { acceptsApplications: false }),
      ).resolves.toEqual(
        expect.objectContaining({ acceptsApplications: false }),
      );
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
  it('redacts application details when the moderator role in the token has been revoked', async () => {
    prisma.user.findUnique.mockResolvedValue({ roles: [] });
    prisma.opportunityApplication.findMany.mockResolvedValue([
      { id: 'application', opportunity },
    ]);
    const [application] = await service.getMyApplications('viewer', [
      Role.OPPORTUNITIES_MODERATOR,
    ]);

    expect(application.opportunity).toEqual({
      id: opportunity.id,
      title: '',
      availability: 'temporary',
    });
  });

  it.each([
    { tokenRole: true, databaseRole: true },
    { tokenRole: false, databaseRole: true },
    { tokenRole: true, databaseRole: false },
  ])(
    'checks both moderator roles in favorites ($tokenRole, $databaseRole)',
    async ({ tokenRole, databaseRole }) => {
      const published = {
        ...opportunity,
        publishedAt: opportunity.createdAt,
        publishedTitle: 'Published title',
        publishedPaymentType: 'UNPAID',
      };
      const roles = [Role.OPPORTUNITIES_MODERATOR];

      prisma.user.findUnique.mockResolvedValue({
        roles: databaseRole ? roles : [],
      });
      prisma.opportunityFavorite.findMany.mockResolvedValue([
        { opportunity: published },
      ]);

      const result = await service.getFavorites(
        'moderator',
        tokenRole ? roles : [],
      );

      expect(result).toEqual(
        tokenRole && databaseRole
          ? [published]
          : [
              {
                id: opportunity.id,
                title: 'Published title',
                paymentType: 'UNPAID',
                availability: 'temporary',
              },
            ],
      );
    },
  );

  it.each(['update', 'lifecycle'] as const)(
    'notifies once for concurrent identical %s calls',
    async (operation) => {
      const published = {
        ...opportunity,
        status: OpportunityStatus.PUBLISHED,
        acceptsApplications: true,
      };
      let persisted = published;

      prisma.opportunity.findUnique.mockImplementation(async () => ({
        ...persisted,
      }));
      prisma.opportunity.update.mockImplementation(
        async ({ where }: { where: Prisma.OpportunityWhereUniqueInput }) => {
          if (
            (where.updatedAt && where.updatedAt !== persisted.updatedAt) ||
            (where.acceptsApplications !== undefined &&
              where.acceptsApplications !== persisted.acceptsApplications) ||
            (where.lifecycleState !== undefined &&
              where.lifecycleState !== persisted.lifecycleState)
          ) {
            throw { code: 'P2025' };
          }

          persisted = {
            ...published,
            acceptsApplications: false,
            lifecycleState: OpportunityLifecycleState.PAUSED,
            updatedAt: new Date('2026-10-01T10:00:01Z'),
          };

          return persisted;
        },
      );
      prisma.opportunityFavorite.findMany.mockResolvedValue([
        { userId: 'subscriber' },
      ]);
      const change = (): ReturnType<typeof service.update> =>
        operation === 'update'
          ? service.update('owner', opportunity.id, {
              acceptsApplications: false,
            })
          : service.changeLifecycleState(
              'owner',
              opportunity.id,
              OpportunityLifecycleState.PAUSED,
            );
      const results = await Promise.allSettled([change(), change()]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(results.find((result) => result.status === 'rejected')).toEqual({
        status: 'rejected',
        reason: expect.any(ConflictException),
      });
      expect(notify).toHaveBeenCalledTimes(1);
    },
  );

  it('bounds concurrent subscriber deliveries while notifying every favorite', async () => {
    const published = {
      ...opportunity,
      status: OpportunityStatus.PUBLISHED,
      acceptsApplications: true,
    };
    let active = 0;
    let peak = 0;
    const recipients: string[] = [];

    prisma.opportunity.findUnique.mockResolvedValue(published);
    prisma.opportunity.update.mockResolvedValue({
      ...published,
      acceptsApplications: false,
    });
    prisma.opportunityFavorite.findMany.mockResolvedValue(
      Array.from({ length: 45 }, (_, index) => ({
        userId: `subscriber-${index}`,
      })),
    );
    notify.mockImplementation(async ({ userId }: { userId: string }) => {
      active += 1;
      peak = Math.max(peak, active);
      recipients.push(userId);
      await Promise.resolve();
      active -= 1;
    });
    await service.update('owner', opportunity.id, {
      acceptsApplications: false,
    });

    expect(peak).toBeLessThanOrEqual(20);
    expect(new Set(recipients).size).toBe(45);
  });
});
