import { Test, TestingModule } from '@nestjs/testing';
import type { ValidationArguments } from 'class-validator';
import { OpportunitiesService } from './opportunities.service';
import { IsContactInfoConstraint } from './opportunities.helpers';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  OpportunityStatus,
  Role,
  type Prisma,
  type Opportunity,
  type OpportunityApplication,
} from '@universe/database';
import {
  OPPORTUNITY_MODERATE_ACTION,
  OPPORTUNITY_VIEW,
  OPPORTUNITY_VIEW_PARAM,
} from '@universe/core/constants/opportunities';

const publishedOpportunity: Opportunity = {
  id: 'race-opportunity',
  title: 'Research assistant',
  description: 'Research project',
  ownerContactInfo: '@research_lab',
  partnerInfo: null,
  status: 'PUBLISHED',
  lifecycleState: 'ACTIVE',
  acceptsApplications: true,
  paymentType: 'UNPAID',
  paymentDetails: null,
  details: null,
  moderationComment: null,
  ownerId: 'owner',
  createdAt: new Date('2026-10-01T10:00:00Z'),
  updatedAt: new Date('2026-10-01T10:00:00Z'),
};

const withdrawnApplication: OpportunityApplication = {
  id: 'withdrawn-application',
  opportunityId: publishedOpportunity.id,
  applicantId: 'candidate',
  applicantName: 'Candidate',
  contactInfo: '@candidate',
  briefDescription: null,
  motivation: null,
  answers: null,
  ownerComment: null,
  status: 'WITHDRAWN',
  createdAt: new Date('2026-10-01T10:00:00Z'),
  updatedAt: new Date('2026-10-01T10:00:00Z'),
};

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
              delete: jest.fn(),
            },
            opportunityApplication: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            $transaction: jest.fn(),
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

    jest
      .spyOn(prisma, '$transaction')
      .mockImplementation(async (callback: any) =>
        typeof callback === 'function' ? callback(prisma) : callback,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      await expect(
        service.findOne('1', 'user', ['MOODLE_STUDENT']),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns opportunity if unpublished and caller is owner', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'owner1',
      } as any);
      const res = await service.findOne('1', 'owner1', ['MOODLE_STUDENT']);

      expect(res).toEqual({ id: '1', status: 'DRAFT', ownerId: 'owner1' });
    });

    it('returns opportunity if unpublished and caller is OPPORTUNITIES_MODERATOR', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'owner1',
      } as any);
      const res = await service.findOne('1', 'mod1', [
        'OPPORTUNITIES_MODERATOR',
      ]);

      expect(res).toEqual({ id: '1', status: 'DRAFT', ownerId: 'owner1' });
    });

    it('returns opportunity if unpublished and caller holds OPPORTUNITIES_MODERATOR among several roles', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'owner1',
      } as any);
      const res = await service.findOne('1', 'mod1', [
        'INSTRUCTOR',
        'OPPORTUNITIES_MODERATOR',
      ]);

      expect(res).toEqual({ id: '1', status: 'DRAFT', ownerId: 'owner1' });
    });

    it('throws NotFoundException if unpublished and caller is ADMIN', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'owner1',
      } as any);

      await expect(service.findOne('1', 'admin1', ['ADMIN'])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if opportunity not found in DB', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('resets status to READY_FOR_REVIEW, clears moderationComment, and notifies moderators if it was published', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        title: 'old',
        status: 'PUBLISHED',
        ownerId: 'user1',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
        id: '1',
        title: 'new',
        status: 'READY_FOR_REVIEW',
      } as any);
      jest
        .spyOn(prisma.user, 'findMany')
        .mockResolvedValue([{ id: 'mod-1' }] as any);

      await service.update('user1', '1', { title: 'new' } as any);

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          title: 'new',
          status: 'READY_FOR_REVIEW',
          moderationComment: null,
        },
      });
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'mod-1',
          type: 'OPPORTUNITY_READY_FOR_REVIEW',
          link: '/opportunities/1',
        }),
      );
    });

    it('does not reset status if only acceptsApplications changed on published opportunity', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        ownerId: 'user1',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({} as any);

      await service.update('user1', '1', { acceptsApplications: false });

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { acceptsApplications: false },
      });
    });

    it('does not reset status if it was DRAFT', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        ownerId: 'user1',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({} as any);

      await service.update('user1', '1', { title: 'new' } as any);

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'new' },
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
    it.each(Object.values(OPPORTUNITY_MODERATE_ACTION))(
      'forbids %s on the moderator own opportunity without writes or notifications',
      async (action) => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
          id: 'moderator-1',
          roles: [Role.OPPORTUNITIES_MODERATOR],
        } as Awaited<ReturnType<typeof prisma.user.findUnique>>);
        jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
          id: 'own-opportunity',
          ownerId: 'moderator-1',
          status: 'READY_FOR_REVIEW',
        } as Awaited<ReturnType<typeof prisma.opportunity.findUnique>>);
        jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
          id: 'own-opportunity',
          ownerId: 'moderator-1',
        } as Awaited<ReturnType<typeof prisma.opportunity.update>>);

        await expect(
          service.moderate('moderator-1', 'own-opportunity', {
            action,
            comment: 'Review feedback',
          }),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.opportunity.update).not.toHaveBeenCalled();
        expect(notificationsService.createNotification).not.toHaveBeenCalled();
      },
    );

    it('throws Forbidden if user is not OPPORTUNITIES_MODERATOR', async () => {
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user1', roles: ['MOODLE_STUDENT'] } as any);
      await expect(
        service.moderate('user1', 'opp1', {} as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws Forbidden if user is ADMIN because only OPPORTUNITIES_MODERATOR can moderate', async () => {
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user1', roles: ['ADMIN'] } as any);
      await expect(
        service.moderate('user1', 'opp1', {} as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if opportunity is not in READY_FOR_REVIEW', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user1',
        roles: ['OPPORTUNITIES_MODERATOR'],
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
        roles: ['OPPORTUNITIES_MODERATOR'],
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
          data: expect.objectContaining({
            status: 'PUBLISHED',
            moderationComment: null,
          }),
        }),
      );
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner1',
          link: '/opportunities/opp1',
        }),
      );
    });

    it('succeeds if user holds OPPORTUNITIES_MODERATOR among several roles', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user1',
        roles: [Role.INSTRUCTOR, Role.OPPORTUNITIES_MODERATOR],
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
        roles: ['OPPORTUNITIES_MODERATOR'],
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
        roles: ['OPPORTUNITIES_MODERATOR'],
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

    it('throws BadRequestException if REQUIRE_CHANGES has no comment or empty comment', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user1',
        roles: ['OPPORTUNITIES_MODERATOR'],
      } as any);
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp1',
        title: 'test',
        ownerId: 'owner1',
        status: 'READY_FOR_REVIEW',
      } as any);

      await expect(
        service.moderate('user1', 'opp1', {
          action: 'REQUIRE_CHANGES',
          comment: '   ',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for unknown moderation action', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user1',
        roles: ['OPPORTUNITIES_MODERATOR'],
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

      await service.findAll({ status: 'READY_FOR_REVIEW' as any }, [
        'OPPORTUNITIES_MODERATOR',
      ]);

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'READY_FOR_REVIEW' }),
        }),
      );
    });

    it('throws ForbiddenException when non-moderator queries unpublished status', async () => {
      await expect(
        service.findAll({ status: 'DRAFT' as any }, ['ADMIN']),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.findAll({ status: 'READY_FOR_REVIEW' as any }, []),
      ).rejects.toThrow(ForbiddenException);
    });

    it('defaults to PUBLISHED when status is omitted', async () => {
      jest.spyOn(prisma.opportunity, 'findMany').mockResolvedValue([] as any);

      await service.findAll({});

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('deletes draft opportunity and applications atomically within a transaction', async () => {
      const draftOpportunity: Opportunity = {
        ...publishedOpportunity,
        id: 'draft-1',
        ownerId: 'owner-1',
        status: OpportunityStatus.DRAFT,
      };

      jest
        .spyOn(prisma.opportunity, 'findUnique')
        .mockResolvedValue(draftOpportunity);
      jest
        .spyOn(prisma.opportunityApplication, 'deleteMany')
        .mockResolvedValue({ count: 2 });
      jest
        .spyOn(prisma.opportunity, 'delete')
        .mockResolvedValue(draftOpportunity);

      const result = await service.delete('owner-1', 'draft-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.opportunityApplication.deleteMany).toHaveBeenCalledWith({
        where: { opportunityId: 'draft-1' },
      });
      expect(prisma.opportunity.delete).toHaveBeenCalledWith({
        where: {
          id: 'draft-1',
          ownerId: 'owner-1',
          status: {
            in: [OpportunityStatus.DRAFT, OpportunityStatus.REQUIRES_CHANGES],
          },
        },
      });
      expect(result).toEqual(draftOpportunity);
    });

    it('throws NotFoundException when opportunity does not exist', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue(null);

      await expect(service.delete('owner-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when user is not the owner', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        ...publishedOpportunity,
        id: 'opp-1',
        ownerId: 'other-user',
        status: OpportunityStatus.DRAFT,
      });

      await expect(service.delete('owner-1', 'opp-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when opportunity is not in DRAFT or REQUIRES_CHANGES statuses', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        ...publishedOpportunity,
        id: 'opp-1',
        ownerId: 'owner-1',
        status: OpportunityStatus.PUBLISHED,
      });

      await expect(service.delete('owner-1', 'opp-1')).rejects.toThrow(
        new BadRequestException(
          'Only opportunities in DRAFT or REQUIRES_CHANGES statuses can be deleted',
        ),
      );
    });

    it('rolls back transaction if opportunity deletion fails after deleteMany', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        ...publishedOpportunity,
        id: 'opp-1',
        ownerId: 'owner-1',
        status: OpportunityStatus.DRAFT,
      });
      jest
        .spyOn(prisma.opportunityApplication, 'deleteMany')
        .mockResolvedValue({ count: 1 });
      jest
        .spyOn(prisma.opportunity, 'delete')
        .mockRejectedValue(new Error('Parent delete failed'));

      await expect(service.delete('owner-1', 'opp-1')).rejects.toThrow(
        'Parent delete failed',
      );
    });

    it('translates P2025 predicate mismatch into BadRequestException if status changes before delete', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        ...publishedOpportunity,
        id: 'opp-1',
        ownerId: 'owner-1',
        status: OpportunityStatus.DRAFT,
      });
      jest
        .spyOn(prisma.opportunityApplication, 'deleteMany')
        .mockResolvedValue({ count: 0 });
      jest
        .spyOn(prisma.opportunity, 'delete')
        .mockRejectedValue({ code: 'P2025' });

      await expect(service.delete('owner-1', 'opp-1')).rejects.toThrow(
        new BadRequestException(
          'Only opportunities in DRAFT or REQUIRES_CHANGES statuses can be deleted',
        ),
      );
    });
  });

  describe('changeStatus', () => {
    it('logs failed moderator deliveries without failing submission or skipping other moderators', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        ...publishedOpportunity,
        status: 'DRAFT',
      });
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
        ...publishedOpportunity,
        status: 'READY_FOR_REVIEW',
      });
      jest
        .spyOn(prisma.user, 'findMany')
        .mockResolvedValue([
          { id: 'moderator-one' },
          { id: 'moderator-two' },
        ] as Awaited<ReturnType<typeof prisma.user.findMany>>);
      const deliveryError = new Error('Notification write failed');
      const deliveries = jest
        .spyOn(notificationsService, 'createNotification')
        .mockRejectedValueOnce(deliveryError)
        .mockResolvedValueOnce({
          id: 'notification-two',
          userId: 'moderator-two',
          title: 'notifications.opportunityReadyForReview.title',
          message: '{}',
          type: 'OPPORTUNITY_READY_FOR_REVIEW',
          link: '/opportunities/race-opportunity',
          isRead: false,
          createdAt: new Date(),
        });
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.changeStatus(
          'owner',
          publishedOpportunity.id,
          'READY_FOR_REVIEW',
        ),
      ).resolves.toMatchObject({ status: 'READY_FOR_REVIEW' });

      expect(deliveries).toHaveBeenCalledTimes(2);
      expect(deliveries).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'moderator-two' }),
      );
      expect(logError).toHaveBeenCalledWith(
        expect.stringContaining('moderator-one'),
        deliveryError.stack,
      );
    });

    it('logs moderator lookup failures without failing the committed submission', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        ...publishedOpportunity,
        status: 'DRAFT',
      });
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
        ...publishedOpportunity,
        status: 'READY_FOR_REVIEW',
      });
      const lookupError = new Error('Moderator lookup failed');

      jest.spyOn(prisma.user, 'findMany').mockRejectedValue(lookupError);
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.changeStatus(
          'owner',
          publishedOpportunity.id,
          'READY_FOR_REVIEW',
        ),
      ).resolves.toMatchObject({ status: 'READY_FOR_REVIEW' });

      expect(logError).toHaveBeenCalledWith(
        expect.stringContaining(publishedOpportunity.id),
        lookupError.stack,
      );
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });
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

    it('updates status to READY_FOR_REVIEW and resets moderationComment when valid', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        title: 'Title 1',
        status: 'DRAFT',
        ownerId: 'user-1',
      } as any);
      jest.spyOn(prisma.opportunity, 'update').mockResolvedValue({
        id: '1',
        title: 'Title 1',
        status: 'READY_FOR_REVIEW',
      } as any);
      jest
        .spyOn(prisma.user, 'findMany')
        .mockResolvedValue([{ id: 'mod-1' }, { id: 'mod-2' }] as any);

      const result = await service.changeStatus(
        'user-1',
        '1',
        'READY_FOR_REVIEW',
      );

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'READY_FOR_REVIEW', moderationComment: null },
      });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { roles: { has: Role.OPPORTUNITIES_MODERATOR } },
        select: { id: true },
      });
      expect(notificationsService.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsService.createNotification).toHaveBeenCalledWith({
        userId: 'mod-1',
        type: 'OPPORTUNITY_READY_FOR_REVIEW',
        title: 'notifications.opportunityReadyForReview.title',
        message: JSON.stringify({ opportunityTitle: 'Title 1' }),
        link: '/opportunities/1',
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

    it('updates status and sends notification without comment', async () => {
      jest
        .spyOn(prisma.opportunityApplication, 'findUnique')
        .mockResolvedValue({
          id: 'app-1',
          applicantId: 'applicant-1',
          opportunityId: 'opp-1',
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
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'applicant-1',
          link: '/opportunities/opp-1',
        }),
      );
    });
  });

  describe('apply', () => {
    it.each(['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'] as const)(
      'rejects resubmission of an application in %s status',
      async (status) => {
        jest
          .spyOn(prisma.opportunity, 'findUnique')
          .mockResolvedValue(publishedOpportunity);
        jest
          .spyOn(prisma.opportunityApplication, 'findFirst')
          .mockResolvedValue({
            ...withdrawnApplication,
            status,
          });

        await expect(
          service.apply('candidate', publishedOpportunity.id, {
            applicantName: 'Candidate',
            contactInfo: '@candidate',
          }),
        ).rejects.toThrow(ConflictException);

        expect(prisma.opportunityApplication.update).not.toHaveBeenCalled();
        expect(notificationsService.createNotification).not.toHaveBeenCalled();
      },
    );

    it('preserves database errors other than a lost resubmission race', async () => {
      jest
        .spyOn(prisma.opportunity, 'findUnique')
        .mockResolvedValue(publishedOpportunity);
      jest
        .spyOn(prisma.opportunityApplication, 'findFirst')
        .mockResolvedValue(withdrawnApplication);
      const databaseError = new Error('Connection lost');

      jest
        .spyOn(prisma.opportunityApplication, 'update')
        .mockRejectedValue(databaseError);

      await expect(
        service.apply('candidate', publishedOpportunity.id, {
          applicantName: 'Candidate',
          contactInfo: '@candidate',
        }),
      ).rejects.toBe(databaseError);

      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('allows only one concurrent resubmission and notifies the owner once', async () => {
      jest
        .spyOn(prisma.opportunity, 'findUnique')
        .mockResolvedValue(publishedOpportunity);
      // Both requests see the withdrawn snapshot before either performs its write.
      jest
        .spyOn(prisma.opportunityApplication, 'findFirst')
        .mockResolvedValue(withdrawnApplication);
      let storedApplication = { ...withdrawnApplication };
      const applicationWrites: {
        update: (
          args: Prisma.OpportunityApplicationUpdateArgs,
        ) => Promise<OpportunityApplication>;
      } = prisma.opportunityApplication;

      jest
        .spyOn(applicationWrites, 'update')
        .mockImplementation(async ({ where }) => {
          if (where.status && where.status !== storedApplication.status) {
            throw { code: 'P2025' };
          }

          storedApplication = { ...storedApplication, status: 'SUBMITTED' };

          return storedApplication;
        });

      const request = { applicantName: 'Candidate', contactInfo: '@candidate' };
      const results = await Promise.allSettled([
        service.apply('candidate', publishedOpportunity.id, request),
        service.apply('candidate', publishedOpportunity.id, request),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const rejected = results.find((result) => result.status === 'rejected');

      expect(rejected).toMatchObject({ reason: expect.any(ConflictException) });
      expect(notificationsService.createNotification).toHaveBeenCalledTimes(1);
    });

    it('does not overwrite a completed application when its status changes before resubmission', async () => {
      jest
        .spyOn(prisma.opportunity, 'findUnique')
        .mockResolvedValue(publishedOpportunity);
      jest
        .spyOn(prisma.opportunityApplication, 'findFirst')
        .mockResolvedValue(withdrawnApplication);
      const storedApplication = {
        ...withdrawnApplication,
        status: 'ACCEPTED' as const,
      };
      const applicationWrites: {
        update: (
          args: Prisma.OpportunityApplicationUpdateArgs,
        ) => Promise<OpportunityApplication>;
      } = prisma.opportunityApplication;

      jest
        .spyOn(applicationWrites, 'update')
        .mockImplementation(async ({ where }) => {
          if (where.status && where.status !== storedApplication.status) {
            throw { code: 'P2025' };
          }

          return { ...storedApplication, status: 'SUBMITTED' };
        });

      await expect(
        service.apply('candidate', publishedOpportunity.id, {
          applicantName: 'Candidate',
          contactInfo: '@candidate',
        }),
      ).rejects.toThrow(ConflictException);

      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException if owner tries to apply to own opportunity', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        acceptsApplications: true,
        ownerId: 'user-1',
      } as any);

      await expect(
        service.apply('user-1', '1', {
          applicantName: 'Іван',
          contactInfo: 'ivan@karazin.ua',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

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
        lifecycleState: 'PAUSED',
        acceptsApplications: true,
        ownerId: 'owner-1',
      } as any);

      await expect(
        service.apply('user-1', '1', {
          applicantName: 'Іван',
          contactInfo: 'ivan@karazin.ua',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows applying if opportunity is on START phase and accepting applications', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        lifecycleState: 'START',
        acceptsApplications: true,
        ownerId: 'owner-1',
        title: 'Тест',
      } as any);
      jest
        .spyOn(prisma.opportunityApplication, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prisma.opportunityApplication, 'create')
        .mockResolvedValue({ id: 'app-1' } as any);

      const res = await service.apply('user-1', '1', {
        applicantName: 'Іван',
        contactInfo: '@ivan_tg',
      });

      expect(res).toEqual({ id: 'app-1' });
    });

    it('throws BadRequestException if opportunity is not accepting applications', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        acceptsApplications: false,
        ownerId: 'owner-1',
      } as any);

      await expect(
        service.apply('user-1', '1', {
          applicantName: 'Іван',
          contactInfo: 'ivan@karazin.ua',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if already applied', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        acceptsApplications: true,
        ownerId: 'owner-1',
      } as any);
      jest.spyOn(prisma.opportunityApplication, 'findFirst').mockResolvedValue({
        id: 'app-1',
      } as any);

      await expect(
        service.apply('user-1', '1', {
          applicantName: 'Іван',
          contactInfo: 'ivan@karazin.ua',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('updates existing WITHDRAWN application to SUBMITTED when user re-applies', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        acceptsApplications: true,
        title: 'Junior QA',
        ownerId: 'owner-1',
      } as any);
      jest.spyOn(prisma.opportunityApplication, 'findFirst').mockResolvedValue({
        id: 'app-withdrawn-1',
        status: 'WITHDRAWN',
        applicantId: 'user-1',
        opportunityId: '1',
      } as any);
      jest.spyOn(prisma.opportunityApplication, 'update').mockResolvedValue({
        id: 'app-withdrawn-1',
        status: 'SUBMITTED',
        opportunityId: '1',
        applicantId: 'user-1',
      } as any);

      const result = await service.apply('user-1', '1', {
        applicantName: 'Іван Оновлений',
        contactInfo: '+380501234567',
        motivation: 'Хочу спробувати ще раз',
      });

      expect(prisma.opportunityApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-withdrawn-1', status: 'WITHDRAWN' },
        data: {
          applicantName: 'Іван Оновлений',
          contactInfo: '+380501234567',
          motivation: 'Хочу спробувати ще раз',
          briefDescription: null,
          answers: null,
          status: 'SUBMITTED',
          ownerComment: null,
        },
      });
      expect(prisma.opportunityApplication.create).not.toHaveBeenCalled();
      expect(result.id).toBe('app-withdrawn-1');
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner-1',
          link: `/opportunities/1?${OPPORTUNITY_VIEW_PARAM}=${OPPORTUNITY_VIEW.APPLICANTS}`,
        }),
      );
    });

    it('creates application and sends notification to owner', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        acceptsApplications: true,
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
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner-1',
          link: `/opportunities/1?${OPPORTUNITY_VIEW_PARAM}=${OPPORTUNITY_VIEW.APPLICANTS}`,
        }),
      );
    });

    it('throws ConflictException on Prisma unique constraint error P2002', async () => {
      jest.spyOn(prisma.opportunity, 'findUnique').mockResolvedValue({
        id: 'opp-1',
        title: 'Title',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        acceptsApplications: true,
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
        acceptsApplications: true,
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

  describe('IsContactInfoConstraint', () => {
    const constraint = new IsContactInfoConstraint();

    it('validates contact strings and rejects invalid values', () => {
      expect(constraint.validate('@valid_user')).toBe(true);
      expect(constraint.validate('+380501234567')).toBe(true);
      expect(constraint.validate('invalid-contact')).toBe(false);
      expect(constraint.validate(12345)).toBe(false);
      expect(constraint.validate(null)).toBe(false);
    });

    it('returns default error message for property', () => {
      const message = constraint.defaultMessage({
        property: 'contactInfo',
      } as ValidationArguments);

      expect(message).toContain('contactInfo must be a valid Telegram');
    });
  });
});
