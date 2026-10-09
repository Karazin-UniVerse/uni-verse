import { Test, TestingModule } from '@nestjs/testing';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@universe/database';

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        {
          provide: PrismaService,
          useValue: {
            opportunity: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            opportunityApplication: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OpportunitiesService>(OpportunitiesService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates an opportunity as DRAFT', async () => {
      const mockOpp = { id: 'opp-1', title: 'Test', ownerId: 'user-1' };

      (prisma.opportunity.create as jest.Mock).mockResolvedValue(mockOpp);

      const result = await service.create('user-1', {
        title: 'Test',
        description: 'Desc',
        ownerContactInfo: 'email@test.com',
      } as any);

      expect(prisma.opportunity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test',
          ownerId: 'user-1',
          status: 'DRAFT',
        }),
      });
      expect(result).toBe(mockOpp);
    });
  });

  describe('findAll', () => {
    it('queries published opportunities by default', async () => {
      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({});

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by status when user is MODERATOR or ADMIN', async () => {
      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({ status: 'READY_FOR_REVIEW' } as any, 'MODERATOR');

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
        where: { status: 'READY_FOR_REVIEW' },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('applies paymentType, ownerId and search filters', async () => {
      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({
        paymentType: 'PAID' as any,
        ownerId: 'owner-1',
        search: 'developer',
      });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PUBLISHED',
          paymentType: 'PAID',
          ownerId: 'owner-1',
          OR: [
            { title: { contains: 'developer', mode: 'insensitive' } },
            { description: { contains: 'developer', mode: 'insensitive' } },
          ],
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException if opportunity does not exist', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('opp-1')).rejects.toThrow(NotFoundException);
    });

    it('returns opportunity if published', async () => {
      const opp = { id: 'opp-1', status: 'PUBLISHED' };

      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(opp);

      const res = await service.findOne('opp-1');

      expect(res).toEqual(opp);
    });

    it('throws Forbidden if unpublished and not owner or moderator', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'other',
      });

      await expect(service.findOne('1', 'user', 'STUDENT')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns unpublished opportunity if user is owner', async () => {
      const opp = { id: '1', status: 'DRAFT', ownerId: 'user-1' };

      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(opp);

      const res = await service.findOne('1', 'user-1', 'STUDENT');

      expect(res).toEqual(opp);
    });

    it('returns unpublished opportunity if user is ADMIN', async () => {
      const opp = { id: '1', status: 'DRAFT', ownerId: 'other' };

      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(opp);

      const res = await service.findOne('1', 'user-1', 'ADMIN');

      expect(res).toEqual(opp);
    });
  });

  describe('update', () => {
    it('throws ForbiddenException if user is not owner', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'owner-1',
      });

      await expect(
        service.update('stranger', '1', { title: 'new' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if user is not owner of published opportunity', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'owner-1',
      });

      await expect(
        service.update('stranger', '1', { title: 'new' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('resets status to READY_FOR_REVIEW if it was published', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'user1',
      });
      (prisma.opportunity.update as jest.Mock).mockResolvedValue({} as any);

      await service.update('user1', '1', { title: 'new' } as any);

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'new', status: 'READY_FOR_REVIEW' },
      });
    });

    it('keeps existing status if it was not PUBLISHED', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'user1',
      });
      (prisma.opportunity.update as jest.Mock).mockResolvedValue({} as any);

      await service.update('user1', '1', { title: 'new' } as any);

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'new' },
      });
    });
  });

  describe('changeStatus', () => {
    it('throws ForbiddenException if user is not owner', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'owner-1',
      });

      await expect(
        service.changeStatus('stranger', '1', 'READY_FOR_REVIEW'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if status is not READY_FOR_REVIEW', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'user1',
      });

      await expect(
        service.changeStatus('user1', '1', 'INVALID' as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if opportunity is not in DRAFT or REQUIRES_CHANGES', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'user1',
      });

      await expect(
        service.changeStatus('user1', '1', 'READY_FOR_REVIEW'),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates status to READY_FOR_REVIEW when in DRAFT', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'user1',
      });
      (prisma.opportunity.update as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'READY_FOR_REVIEW',
      });

      const res = await service.changeStatus('user1', '1', 'READY_FOR_REVIEW');

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'READY_FOR_REVIEW' },
      });
      expect(res.status).toBe('READY_FOR_REVIEW');
    });
  });

  describe('changeLifecycleState', () => {
    it('throws ForbiddenException if user is not owner', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'owner-1',
      });

      await expect(
        service.changeLifecycleState('stranger', '1', 'ACTIVE'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates lifecycle state on opportunity', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'user1',
      });
      (prisma.opportunity.update as jest.Mock).mockResolvedValue({
        id: '1',
        lifecycleState: 'ACTIVE',
      });

      const res = await service.changeLifecycleState('user1', '1', 'ACTIVE');

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { lifecycleState: 'ACTIVE' },
      });
      expect(res.lifecycleState).toBe('ACTIVE');
    });
  });

  describe('getOpportunityApplications', () => {
    it('throws ForbiddenException if user is not owner', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'owner-1',
      });

      await expect(
        service.getOpportunityApplications('stranger', '1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns applications for owner', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'user1',
      });
      (prisma.opportunityApplication.findMany as jest.Mock).mockResolvedValue([
        { id: 'app-1' },
      ]);

      const res = await service.getOpportunityApplications('user1', '1');

      expect(prisma.opportunityApplication.findMany).toHaveBeenCalledWith({
        where: { opportunityId: '1' },
        include: {
          applicant: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(res).toEqual([{ id: 'app-1' }]);
    });
  });

  describe('updateApplicationStatus', () => {
    it('throws NotFoundException if application not found', async () => {
      (prisma.opportunityApplication.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.updateApplicationStatus({
          userId: 'user1',
          applicationId: 'app-1',
          status: 'ACCEPTED',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not opportunity owner', async () => {
      (prisma.opportunityApplication.findUnique as jest.Mock).mockResolvedValue(
        {
          id: 'app-1',
          opportunity: { ownerId: 'real-owner' },
        },
      );

      await expect(
        service.updateApplicationStatus({
          userId: 'stranger',
          applicationId: 'app-1',
          status: 'ACCEPTED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates application to ACCEPTED, REJECTED, and UNDER_REVIEW and notifies applicant', async () => {
      const mockApp = {
        id: 'app-1',
        applicantId: 'applicant-1',
        opportunity: { ownerId: 'user1', title: 'Frontend Role' },
      };

      (prisma.opportunityApplication.findUnique as jest.Mock).mockResolvedValue(
        mockApp,
      );
      (prisma.opportunityApplication.update as jest.Mock).mockResolvedValue({
        ...mockApp,
        status: 'ACCEPTED',
      });

      await service.updateApplicationStatus({
        userId: 'user1',
        applicationId: 'app-1',
        status: 'ACCEPTED',
        ownerComment: 'Welcome aboard',
      });

      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'applicant-1',
          title: 'Статус відгуку змінено',
          message: expect.stringContaining('прийнято'),
        }),
      );

      // test REJECTED
      await service.updateApplicationStatus({
        userId: 'user1',
        applicationId: 'app-1',
        status: 'REJECTED',
      });
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('відхилено'),
        }),
      );

      // test UNDER_REVIEW
      await service.updateApplicationStatus({
        userId: 'user1',
        applicationId: 'app-1',
        status: 'UNDER_REVIEW',
      });
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('на розгляді'),
        }),
      );
    });
  });

  describe('apply', () => {
    it('throws BadRequestException if opportunity is not PUBLISHED', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: 'opp-1',
        status: 'DRAFT',
        ownerId: 'applicant-1',
      });

      await expect(
        service.apply('applicant-1', 'opp-1', {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if owner tries to apply to own opportunity', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: 'opp-1',
        status: 'PUBLISHED',
        ownerId: 'owner-1',
      });

      await expect(
        service.apply('owner-1', 'opp-1', {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if opportunity is not ACTIVE', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: 'opp-1',
        status: 'PUBLISHED',
        lifecycleState: 'PAUSED',
        ownerId: 'owner-1',
      });

      await expect(
        service.apply('applicant-1', 'opp-1', {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if already applied', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: 'opp-1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        ownerId: 'owner-1',
      });
      (prisma.opportunityApplication.findFirst as jest.Mock).mockResolvedValue({
        id: 'app-old',
      });

      await expect(
        service.apply('applicant-1', 'opp-1', {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles Prisma unique constraint collision (already applied)', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: 'opp-1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        ownerId: 'owner-1',
      });
      (prisma.opportunityApplication.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '7',
      });

      (prisma.opportunityApplication.create as jest.Mock).mockRejectedValue(
        error,
      );

      await expect(
        service.apply('applicant-1', 'opp-1', {
          applicantName: 'John',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected error during application creation', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: 'opp-1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        ownerId: 'owner-1',
      });
      (prisma.opportunityApplication.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prisma.opportunityApplication.create as jest.Mock).mockRejectedValue(
        new Error('DB failure'),
      );

      await expect(
        service.apply('applicant-1', 'opp-1', {
          applicantName: 'John',
        } as any),
      ).rejects.toThrow('DB failure');
    });

    it('creates application and sends notification to owner', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: 'opp-1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        ownerId: 'owner-1',
        title: 'Internship',
      });
      (prisma.opportunityApplication.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      const mockCreatedApp = { id: 'app-1', applicantId: 'applicant-1' };

      (prisma.opportunityApplication.create as jest.Mock).mockResolvedValue(
        mockCreatedApp,
      );

      const result = await service.apply('applicant-1', 'opp-1', {
        applicantName: 'John',
        contactInfo: 'tg: @john',
      } as any);

      expect(notificationsService.createNotification).toHaveBeenCalledWith({
        userId: 'owner-1',
        title: 'Новий відгук!',
        message: expect.stringContaining('John'),
        link: '/my-opportunities/opp-1',
      });
      expect(result).toBe(mockCreatedApp);
    });
  });

  describe('withdrawApplication', () => {
    it('throws NotFoundException if application not found', async () => {
      (prisma.opportunityApplication.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.withdrawApplication('user-1', 'app-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not applicant', async () => {
      (prisma.opportunityApplication.findUnique as jest.Mock).mockResolvedValue(
        {
          id: 'app-1',
          applicantId: 'owner',
        },
      );

      await expect(
        service.withdrawApplication('stranger', 'app-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if application already ACCEPTED or REJECTED', async () => {
      (prisma.opportunityApplication.findUnique as jest.Mock).mockResolvedValue(
        {
          id: 'app-1',
          applicantId: 'user-1',
          status: 'ACCEPTED',
        },
      );

      await expect(
        service.withdrawApplication('user-1', 'app-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates application status to WITHDRAWN', async () => {
      (prisma.opportunityApplication.findUnique as jest.Mock).mockResolvedValue(
        {
          id: 'app-1',
          applicantId: 'user-1',
          status: 'SUBMITTED',
        },
      );
      (prisma.opportunityApplication.update as jest.Mock).mockResolvedValue({
        id: 'app-1',
        status: 'WITHDRAWN',
      });

      const res = await service.withdrawApplication('user-1', 'app-1');

      expect(prisma.opportunityApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        data: { status: 'WITHDRAWN' },
      });
      expect(res.status).toBe('WITHDRAWN');
    });
  });

  describe('getMyApplications and getMyOpportunities', () => {
    it('returns applications for user', async () => {
      (prisma.opportunityApplication.findMany as jest.Mock).mockResolvedValue([
        { id: 'app-1' },
      ]);

      const res = await service.getMyApplications('user-1');

      expect(prisma.opportunityApplication.findMany).toHaveBeenCalledWith({
        where: { applicantId: 'user-1' },
        include: { opportunity: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(res).toEqual([{ id: 'app-1' }]);
    });

    it('returns opportunities for owner', async () => {
      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
        { id: 'opp-1' },
      ]);

      const res = await service.getMyOpportunities('user-1');

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(res).toEqual([{ id: 'opp-1' }]);
    });
  });

  describe('moderate', () => {
    it('throws Forbidden if user is not MODERATOR or ADMIN', async () => {
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user1', role: 'STUDENT' } as any);
      await expect(
        service.moderate('user1', 'opp1', {} as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if opportunity is not in READY_FOR_REVIEW', async () => {
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user1', role: 'MODERATOR' } as any);
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp1',
        status: 'DRAFT',
        ownerId: 'owner1',
      } as any);

      await expect(
        service.moderate('user1', 'opp1', { action: 'APPROVE' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for unknown moderation action', async () => {
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user1', role: 'MODERATOR' } as any);
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp1',
        status: 'READY_FOR_REVIEW',
        ownerId: 'owner1',
      } as any);

      await expect(
        service.moderate('user1', 'opp1', { action: 'INVALID' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles REJECT and REQUIRE_CHANGES moderation actions', async () => {
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user1', role: 'ADMIN' } as any);
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        status: 'READY_FOR_REVIEW',
        ownerId: 'owner1',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        ownerId: 'owner1',
      } as any);

      await service.moderate('user1', 'opp1', {
        action: 'REJECT',
        comment: 'bad',
      } as any);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('відхилена'),
        }),
      );

      await service.moderate('user1', 'opp1', {
        action: 'REQUIRE_CHANGES',
      } as any);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('повернута на доопрацювання'),
        }),
      );
    });

    it('updates status and sends notification if user is MODERATOR', async () => {
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user1', role: 'MODERATOR' } as any);
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        status: 'READY_FOR_REVIEW',
        ownerId: 'owner1',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        ownerId: 'owner1',
      } as any);
      await service.moderate('user1', 'opp1', { action: 'APPROVE' } as any);
      expect(prisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });
  });
});
