import { Test, TestingModule } from '@nestjs/testing';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

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

  describe('findOne', () => {
    it('returns opportunity if published', async () => {
      jest
        .spyOn(prisma.opportunity, 'findUnique')
        .mockResolvedValue({ id: '1', status: 'PUBLISHED' } as any);
      const res = await service.findOne('1');

      expect(res).toEqual({ id: '1', status: 'PUBLISHED' });
    });

    it('throws NotFoundException if unpublished and not owner or moderator', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'other',
      } as any);
      await expect(service.findOne('1', 'user', 'STUDENT')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns opportunity if unpublished and caller is owner', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'owner1',
      } as any);
      const res = await service.findOne('1', 'owner1', 'STUDENT');

      expect(res).toEqual({ id: '1', status: 'DRAFT', ownerId: 'owner1' });
    });

    it('returns opportunity if unpublished and caller is OPPORTUNITIES_MODERATOR', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'owner1',
      } as any);
      const res = await service.findOne('1', 'mod1', 'OPPORTUNITIES_MODERATOR');

      expect(res).toEqual({ id: '1', status: 'DRAFT', ownerId: 'owner1' });
    });

    it('throws NotFoundException if unpublished and caller is ADMIN', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'owner1',
      } as any);

      await expect(service.findOne('1', 'admin1', 'ADMIN')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('resets status to READY_FOR_REVIEW if it was published', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'user1',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({} as any);
      await service.update('user1', '1', { title: 'new' } as any);
      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'new', status: 'READY_FOR_REVIEW' },
      });
    });

    it('throws ForbiddenException if user is not the owner', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'other-user',
      } as any);

      await expect(
        service.update('user1', '1', { title: 'new' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('moderate', () => {
    it('throws Forbidden if user is not OPPORTUNITIES_MODERATOR', async () => {
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user1', role: 'STUDENT' } as any);
      await expect(
        service.moderate('user1', 'opp1', {} as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws Forbidden if user is ADMIN because only OPPORTUNITIES_MODERATOR can moderate', async () => {
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user1', role: 'ADMIN' } as any);
      await expect(
        service.moderate('user1', 'opp1', {} as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if opportunity is not in READY_FOR_REVIEW', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user1',
        role: 'OPPORTUNITIES_MODERATOR',
      } as any);
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        ownerId: 'owner1',
        status: 'DRAFT',
      } as any);

      await expect(
        service.moderate('user1', 'opp1', { action: 'APPROVE' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates status and sends notification if user is OPPORTUNITIES_MODERATOR (APPROVE)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user1',
        role: 'OPPORTUNITIES_MODERATOR',
      } as any);
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        ownerId: 'owner1',
        status: 'READY_FOR_REVIEW',
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

    it('updates status to REJECTED when action is REJECT', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user1',
        role: 'OPPORTUNITIES_MODERATOR',
      } as any);
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        ownerId: 'owner1',
        status: 'READY_FOR_REVIEW',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        ownerId: 'owner1',
      } as any);

      await service.moderate('user1', 'opp1', {
        action: 'REJECT',
        comment: 'Не відповідає вимогам',
      } as any);

      expect(prisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            moderationComment: 'Не відповідає вимогам',
          }),
        }),
      );
    });

    it('updates status to REQUIRES_CHANGES when action is REQUIRE_CHANGES', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user1',
        role: 'OPPORTUNITIES_MODERATOR',
      } as any);
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        ownerId: 'owner1',
        status: 'READY_FOR_REVIEW',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        ownerId: 'owner1',
      } as any);

      await service.moderate('user1', 'opp1', {
        action: 'REQUIRE_CHANGES',
        comment: 'Уточніть деталі',
      } as any);

      expect(prisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REQUIRES_CHANGES',
            moderationComment: 'Уточніть деталі',
          }),
        }),
      );
    });

    it('throws BadRequestException for unknown moderation action', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user1',
        role: 'OPPORTUNITIES_MODERATOR',
      } as any);
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        ownerId: 'owner1',
        status: 'READY_FOR_REVIEW',
      } as any);

      await expect(
        service.moderate('user1', 'opp1', { action: 'INVALID' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('creates an opportunity with DRAFT status', async () => {
      const dto = {
        title: 'Тестова вакансія',
        description: 'Опис вакансії',
        paymentType: 'PAID' as const,
        ownerContactInfo: 'test@karazin.ua',
      };

      jest.spyOn(prisma.opportunity, 'create').mockResolvedValue({
        id: 'opp-1',
        ...dto,
        ownerId: 'user-1',
        status: 'DRAFT',
      } as any);

      const result = await service.create('user-1', dto);

      expect(prisma.opportunity.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          ownerId: 'user-1',
          status: 'DRAFT',
        },
      });
      expect(result.id).toBe('opp-1');
    });
  });

  describe('findAll', () => {
    it('returns published opportunities with filters', async () => {
      jest
        .spyOn(prisma.opportunity, 'findMany')
        .mockResolvedValue([
          { id: '1', title: 'React dev', status: 'PUBLISHED' },
        ] as any);

      const result = await service.findAll({
        paymentType: 'PAID' as any,
        ownerId: 'owner-1',
        search: 'React',
      });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PUBLISHED',
          paymentType: 'PAID',
          ownerId: 'owner-1',
          OR: [
            { title: { contains: 'React', mode: 'insensitive' } },
            { description: { contains: 'React', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result).toHaveLength(1);
    });

    it('allows OPPORTUNITIES_MODERATOR to query specific statuses', async () => {
      jest.spyOn(prisma.opportunity, 'findMany').mockResolvedValue([] as any);

      await service.findAll(
        { status: 'READY_FOR_REVIEW' as any },
        'OPPORTUNITIES_MODERATOR',
      );

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'READY_FOR_REVIEW' }),
        }),
      );
    });

    it('forces PUBLISHED status when user is ADMIN or regular user', async () => {
      jest.spyOn(prisma.opportunity, 'findMany').mockResolvedValue([] as any);

      await service.findAll({ status: 'DRAFT' as any }, 'ADMIN');

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });
  });

  describe('changeStatus', () => {
    it('throws NotFoundException if not owner and opportunity is unpublished', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'other-user',
      } as any);

      await expect(
        service.changeStatus('user-1', '1', 'READY_FOR_REVIEW'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if not owner and opportunity is published', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'other-user',
      } as any);

      await expect(
        service.changeStatus('user-1', '1', 'READY_FOR_REVIEW'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if transition is invalid', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'user-1',
      } as any);

      await expect(
        service.changeStatus('user-1', '1', 'READY_FOR_REVIEW'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if target status is not READY_FOR_REVIEW', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'user-1',
      } as any);

      await expect(
        service.changeStatus('user-1', '1', 'PUBLISHED' as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates status to READY_FOR_REVIEW when valid', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'user-1',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
        id: '1',
        status: 'READY_FOR_REVIEW',
      } as any);

      const result = await service.changeStatus(
        'user-1',
        '1',
        'READY_FOR_REVIEW',
      );

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'READY_FOR_REVIEW' },
      });
      expect(result.status).toBe('READY_FOR_REVIEW');
    });
  });

  describe('changeLifecycleState', () => {
    it('throws ForbiddenException if not owner', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'other',
      } as any);

      await expect(
        service.changeLifecycleState('user-1', '1', 'ACTIVE' as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates lifecycleState when caller is owner', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'user-1',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
        id: '1',
        lifecycleState: 'CLOSED',
      } as any);

      const result = await service.changeLifecycleState(
        'user-1',
        '1',
        'CLOSED' as any,
      );

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { lifecycleState: 'CLOSED' },
      });
      expect(result.lifecycleState).toBe('CLOSED');
    });
  });

  describe('getOpportunityApplications', () => {
    it('throws ForbiddenException if not owner', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'other',
      } as any);

      await expect(
        service.getOpportunityApplications('user-1', '1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns applications when caller is owner', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'user-1',
      } as any);
      jest
        .spyOn(prisma.opportunityApplication, 'findMany')
        .mockResolvedValue([{ id: 'app-1', applicantId: 'user-2' }] as any);

      const result = await service.getOpportunityApplications('user-1', '1');

      expect(result).toHaveLength(1);
    });
  });

  describe('updateApplicationStatus', () => {
    it('throws NotFoundException if application not found', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.updateApplicationStatus({
          userId: 'user-1',
          applicationId: 'app-1',
          status: 'ACCEPTED' as any,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if caller is not opportunity owner', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          opportunity: { ownerId: 'other' },
        } as any);

      await expect(
        service.updateApplicationStatus({
          userId: 'user-1',
          applicationId: 'app-1',
          status: 'ACCEPTED' as any,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates status and sends notification with Ukrainian status', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          applicantId: 'applicant-1',
          opportunity: { id: 'opp-1', title: 'React dev', ownerId: 'user-1' },
        } as any);
      jest.spyOn(prisma.opportunityApplication, 'update').mockResolvedValue({
        id: 'app-1',
        status: 'ACCEPTED',
      } as any);

      const result = await service.updateApplicationStatus({
        userId: 'user-1',
        applicationId: 'app-1',
        status: 'ACCEPTED' as any,
        ownerComment: 'Вітаємо',
      });

      expect(prisma.opportunityApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        data: { status: 'ACCEPTED', ownerComment: 'Вітаємо' },
      });
      expect(result.status).toBe('ACCEPTED');
    });

    it('throws BadRequestException if application is already WITHDRAWN', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          status: 'WITHDRAWN',
          opportunity: { ownerId: 'user-1' },
        } as any);

      await expect(
        service.updateApplicationStatus({
          userId: 'user-1',
          applicationId: 'app-1',
          status: 'ACCEPTED' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if target status is not allowed for owner', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          status: 'SUBMITTED',
          opportunity: { ownerId: 'user-1' },
        } as any);

      await expect(
        service.updateApplicationStatus({
          userId: 'user-1',
          applicationId: 'app-1',
          status: 'WITHDRAWN' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('apply', () => {
    it('throws BadRequestException if opportunity is unpublished', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'user-1',
      } as any);

      await expect(
        service.apply('user-1', '1', {
          applicantName: 'Іван',
          contactInfo: 'ivan@karazin.ua',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if opportunity is not active', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        lifecycleState: 'CLOSED',
        ownerId: 'user-1',
      } as any);

      await expect(
        service.apply('user-1', '1', {
          applicantName: 'Іван',
          contactInfo: 'ivan@karazin.ua',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if already applied', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
      } as any);
      jest.spyOn(prisma.opportunityApplication, 'findFirst').mockResolvedValue({
        id: 'app-1',
      } as any);

      await expect(
        service.apply('user-1', '1', {
          applicantName: 'Іван',
          contactInfo: 'ivan@karazin.ua',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates application and sends notification to owner', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        title: 'Junior QA',
        ownerId: 'owner-1',
      } as any);
      jest
        .spyOn(prisma.opportunityApplication, 'findFirst')
        .mockResolvedValue(null);
      jest.spyOn(prisma.opportunityApplication, 'create').mockResolvedValue({
        id: 'app-new',
        opportunityId: '1',
        applicantId: 'user-1',
      } as any);

      const result = await service.apply('user-1', '1', {
        applicantName: 'Іван',
        contactInfo: 'ivan@karazin.ua',
      });

      expect(prisma.opportunityApplication.create).toHaveBeenCalled();
      expect(result.id).toBe('app-new');
    });
  });

  describe('withdrawApplication', () => {
    it('throws NotFoundException if application not found', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.withdrawApplication('user-1', 'app-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if caller is not the applicant', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          applicantId: 'other-user',
        } as any);

      await expect(
        service.withdrawApplication('user-1', 'app-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if application already ACCEPTED or REJECTED', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          applicantId: 'user-1',
          status: 'ACCEPTED',
        } as any);

      await expect(
        service.withdrawApplication('user-1', 'app-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('withdraws application successfully', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          applicantId: 'user-1',
          status: 'SUBMITTED',
        } as any);
      jest.spyOn(prisma.opportunityApplication, 'update').mockResolvedValue({
        id: 'app-1',
        status: 'WITHDRAWN',
      } as any);

      const result = await service.withdrawApplication('user-1', 'app-1');

      expect(result.status).toBe('WITHDRAWN');
    });
  });

  describe('updateApplicationStatus', () => {
    it('throws NotFoundException if application not found', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.updateApplicationStatus({
          userId: 'owner-1',
          applicationId: 'app-1',
          status: 'ACCEPTED',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not the opportunity owner', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          opportunity: { ownerId: 'other-user', title: 'Opp' },
        } as any);

      await expect(
        service.updateApplicationStatus({
          userId: 'owner-1',
          applicationId: 'app-1',
          status: 'ACCEPTED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if status is not allowed', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          opportunity: { ownerId: 'owner-1', title: 'Opp' },
        } as any);

      await expect(
        service.updateApplicationStatus({
          userId: 'owner-1',
          applicationId: 'app-1',
          status: 'INVALID_STATUS' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates status and sends notification with comment', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          applicantId: 'applicant-1',
          opportunity: { ownerId: 'owner-1', title: 'Opp' },
        } as any);
      const mockUpdated = { id: 'app-1', status: 'ACCEPTED' };

      jest
        .spyOn(prisma.opportunityApplication, 'update')
        .mockResolvedValue(mockUpdated as any);

      const result = await service.updateApplicationStatus({
        userId: 'owner-1',
        applicationId: 'app-1',
        status: 'ACCEPTED',
        ownerComment: 'Welcome!',
      });

      expect(result).toBe(mockUpdated);
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });

    it('updates status and sends notification without comment', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          applicantId: 'applicant-1',
          opportunity: { ownerId: 'owner-1', title: 'Opp' },
        } as any);
      const mockUpdated = { id: 'app-1', status: 'REJECTED' };

      jest
        .spyOn(prisma.opportunityApplication, 'update')
        .mockResolvedValue(mockUpdated as any);

      const result = await service.updateApplicationStatus({
        userId: 'owner-1',
        applicationId: 'app-1',
        status: 'REJECTED',
      });

      expect(result).toBe(mockUpdated);
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });
  });

  describe('apply', () => {
    it('applies to opportunity and creates notification', async () => {
      const opportunity = {
        id: 'opp-1',
        title: 'Title',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        ownerId: 'owner-1',
      };

      jest
        .spyOn(prisma.opportunity, 'findUnique')
        .mockResolvedValue(opportunity as any);
      jest
        .spyOn(prisma.opportunityApplication, 'findFirst')
        .mockResolvedValue(null);
      const mockCreated = { id: 'app-1', applicantId: 'user-1' };

      jest
        .spyOn(prisma.opportunityApplication, 'create')
        .mockResolvedValue(mockCreated as any);

      const result = await service.apply('user-1', 'opp-1', {
        applicantName: 'Student',
        contactInfo: 'student@example.com',
      } as any);

      expect(result).toBe(mockCreated);
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });

    it('throws ConflictException on Prisma unique constraint error P2002', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp-1',
        title: 'Title',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        ownerId: 'owner-1',
      } as any);
      jest
        .spyOn(prisma.opportunityApplication, 'findFirst')
        .mockResolvedValue(null);
      const error = { code: 'P2002' };

      jest
        .spyOn(prisma.opportunityApplication, 'create')
        .mockRejectedValue(error);

      await expect(
        service.apply('user-1', 'opp-1', {
          applicantName: 'Student',
          contactInfo: 'student@example.com',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows other database errors', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp-1',
        title: 'Title',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        ownerId: 'owner-1',
      } as any);
      jest
        .spyOn(prisma.opportunityApplication, 'findFirst')
        .mockResolvedValue(null);
      const error = new Error('Database down');

      jest
        .spyOn(prisma.opportunityApplication, 'create')
        .mockRejectedValue(error);

      await expect(
        service.apply('user-1', 'opp-1', {
          applicantName: 'Student',
          contactInfo: 'student@example.com',
        } as any),
      ).rejects.toThrow(error);
    });
  });

  describe('getMyApplications and getMyOpportunities', () => {
    it('returns applications for user', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findMany')
        .mockResolvedValue([{ id: 'app-1' }] as any);

      const res = await service.getMyApplications('user-1');

      expect(res).toHaveLength(1);
    });

    it('returns opportunities owned by user', async () => {
      jest
        .spyOn(prisma.opportunity, 'findMany')
        .mockResolvedValue([{ id: 'opp-1' }] as any);

      const res = await service.getMyOpportunities('user-1');

      expect(res).toHaveLength(1);
    });
  });
});
