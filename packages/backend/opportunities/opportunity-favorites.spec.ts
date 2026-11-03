import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OpportunityStatus, Role } from '@universe/database';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('Opportunity favorites and restricted listings', () => {
  const opportunity = {
    id: 'opportunity',
    ownerId: 'owner',
    title: 'Unreviewed title',
    description: 'Private revision',
    ownerContactInfo: '@private',
    paymentType: 'PAID',
    status: OpportunityStatus.READY_FOR_REVIEW,
    moderationComment: 'Private moderation feedback',
    owner: { id: 'owner', name: 'Owner', email: 'private@example.com' },
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    opportunity: { findUnique: jest.fn(), update: jest.fn() },
    opportunityFavorite: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    opportunityApplication: { findMany: jest.fn() },
  };
  let service: OpportunitiesService;
  const notify = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
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
  });

  it('rejects saving an owned opportunity', async () => {
    await expect(
      service.addFavorite('owner', opportunity.id),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.opportunityFavorite.createMany).not.toHaveBeenCalled();
  });

  it('rejects newly saving an unpublished opportunity', async () => {
    await expect(
      service.addFavorite('viewer', opportunity.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('saves published opportunities idempotently with a public snapshot', async () => {
    prisma.opportunity.findUnique.mockResolvedValue({
      ...opportunity,
      status: OpportunityStatus.PUBLISHED,
    });
    await service.addFavorite('viewer', opportunity.id);
    expect(prisma.opportunityFavorite.createMany).toHaveBeenCalledWith({
      data: {
        userId: 'viewer',
        opportunityId: opportunity.id,
        title: opportunity.title,
        paymentType: 'PAID',
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
          title: 'Published title',
          paymentType: 'UNPAID',
          opportunity: { ...opportunity, status },
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

  it('redacts unpublished opportunity content in My Applications', async () => {
    prisma.opportunityApplication.findMany.mockResolvedValue([
      { id: 'application', motivation: 'My motivation', opportunity },
    ]);
    const [application] = await service.getMyApplications('viewer');

    expect(application.opportunity).toEqual({
      id: opportunity.id,
      title: '',
      availability: 'temporary',
    });
    expect(application.motivation).toBe('My motivation');
  });

  it('keeps moderator access to application opportunity details', async () => {
    prisma.opportunityApplication.findMany.mockResolvedValue([
      { id: 'application', opportunity },
    ]);
    const [application] = await service.getMyApplications('viewer', [
      Role.OPPORTUNITIES_MODERATOR,
    ]);

    expect(application.opportunity).toEqual(opportunity);
  });

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
      }),
    );
  });

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
    expect(prisma.opportunityFavorite.updateMany).not.toHaveBeenCalled();
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
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'subscriber',
        type: 'OPPORTUNITY_UPDATED',
      }),
    );
    expect(prisma.opportunityFavorite.updateMany).toHaveBeenCalledWith({
      where: { opportunityId: opportunity.id },
      data: { title: opportunity.title, paymentType: opportunity.paymentType },
    });
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
        }),
      );
      expect(prisma.opportunityFavorite.updateMany).toHaveBeenCalled();
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
});
