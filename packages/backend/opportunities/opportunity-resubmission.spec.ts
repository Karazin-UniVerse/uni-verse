import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OPPORTUNITY_MODERATE_ACTION } from '@universe/core/constants/opportunities';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OpportunitiesService } from './opportunities.service';

describe('opportunity revision requirement', () => {
  const originalContent = {
    title: 'Research assistant',
    description: 'Help with the research project',
    ownerContactInfo: '@research_team',
    paymentType: 'UNPAID' as const,
    paymentDetails: null,
  };

  async function setup(status = 'READY_FOR_REVIEW') {
    const stored = {
      id: 'revision-1',
      ownerId: 'owner-1',
      ...originalContent,
      status,
      lifecycleState: 'START',
      acceptsApplications: true,
      moderationComment: null,
      moderationContentHash: null,
      updatedAt: new Date('2026-10-01'),
    };
    const prisma = {
      opportunity: {
        findUnique: jest.fn(async () => ({ ...stored })),
        update: jest.fn(async ({ where, data }) => {
          if (
            (where.status && where.status !== stored.status) ||
            (where.updatedAt &&
              where.updatedAt.getTime() !== stored.updatedAt.getTime())
          )
            throw { code: 'P2025' };

          Object.assign(stored, data);

          return { ...stored };
        }),
      },
      user: {
        findUnique: jest.fn(async () => ({
          roles: ['OPPORTUNITIES_MODERATOR'],
        })),
        findMany: jest.fn(async () => []),
      },
    };
    const notifications = { createNotification: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    return {
      service: module.get(OpportunitiesService),
      stored,
      prisma,
      notifications,
    };
  }

  async function requestChanges(service: OpportunitiesService): Promise<void> {
    await service.moderate('moderator-1', 'revision-1', {
      action: OPPORTUNITY_MODERATE_ACTION.REQUIRE_CHANGES,
      comment: 'Correct the description',
    });
  }

  it('blocks immediate resubmission after moderator feedback', async () => {
    const { service, prisma, notifications } = await setup();

    await requestChanges(service);
    prisma.opportunity.update.mockClear();
    notifications.createNotification.mockClear();
    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.opportunity.update).not.toHaveBeenCalled();
    expect(notifications.createNotification).not.toHaveBeenCalled();
  });

  it.each([
    ['saving unchanged content', originalContent],
    ['adding only outer whitespace', { title: ` ${originalContent.title} ` }],
    ['changing only application acceptance', { acceptsApplications: false }],
  ])('does not unlock resubmission by %s', async (_label, changes) => {
    const { service } = await setup();

    await requestChanges(service);
    await service.update('owner-1', 'revision-1', changes);
    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not unlock resubmission by changing lifecycle', async () => {
    const { service } = await setup();

    await requestChanges(service);
    await service.changeLifecycleState('owner-1', 'revision-1', 'ACTIVE');
    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks resubmission after reverting an edit to the reviewed content', async () => {
    const { service } = await setup();

    await requestChanges(service);
    await service.update('owner-1', 'revision-1', {
      description: 'An edited description',
    });
    await service.update('owner-1', 'revision-1', originalContent);
    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows corrected content and uses a fresh baseline for the next review', async () => {
    const { service } = await setup();

    await requestChanges(service);
    await service.update('owner-1', 'revision-1', {
      description: 'An edited description',
    });
    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).resolves.toMatchObject({
      status: 'READY_FOR_REVIEW',
      moderationComment: null,
    });
    await requestChanges(service);
    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires a real edit for old feedback records without a stored baseline', async () => {
    const { service } = await setup('REQUIRES_CHANGES');

    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).rejects.toThrow(BadRequestException);
    await service.update('owner-1', 'revision-1', originalContent);
    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).rejects.toThrow(BadRequestException);
    await service.update('owner-1', 'revision-1', {
      description: 'Corrected legacy record',
    });
    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).resolves.toMatchObject({ status: 'READY_FOR_REVIEW' });
  });

  it('allows first submission of a draft without a baseline', async () => {
    const { service } = await setup('DRAFT');

    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).resolves.toMatchObject({ status: 'READY_FOR_REVIEW' });
  });

  it('does not submit an edit reverted concurrently after the eligibility read', async () => {
    const { service, prisma, stored, notifications } = await setup();

    await requestChanges(service);
    await service.update('owner-1', 'revision-1', {
      description: 'An edited description',
    });
    prisma.opportunity.findUnique.mockImplementationOnce(async () => {
      const snapshot = { ...stored };

      Object.assign(stored, originalContent, {
        updatedAt: new Date('2026-10-02'),
      });

      return snapshot;
    });
    notifications.createNotification.mockClear();
    await expect(
      service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW'),
    ).rejects.toThrow();
    expect(stored.status).toBe('REQUIRES_CHANGES');
    expect(notifications.createNotification).not.toHaveBeenCalled();
  });

  it('rejects a stale reverting edit that finishes after resubmission', async () => {
    const { service, prisma, stored } = await setup();

    await requestChanges(service);
    await service.update('owner-1', 'revision-1', {
      description: 'Corrected description',
    });
    prisma.opportunity.findUnique.mockImplementationOnce(async () => {
      const snapshot = { ...stored };

      await service.changeStatus('owner-1', 'revision-1', 'READY_FOR_REVIEW');

      return snapshot;
    });
    await expect(
      service.update('owner-1', 'revision-1', originalContent),
    ).rejects.toThrow(ConflictException);
    expect(stored.status).toBe('READY_FOR_REVIEW');
    expect(stored.description).toBe('Corrected description');
  });
});
