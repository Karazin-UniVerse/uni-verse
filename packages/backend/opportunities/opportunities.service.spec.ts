import { Test, TestingModule } from '@nestjs/testing';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ForbiddenException } from '@nestjs/common';

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;
  let prisma: PrismaService;

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

    it('throws Forbidden if unpublished and not owner or moderator', async () => {
      jest
        .spyOn(prisma.opportunity, 'findUnique')
        .mockResolvedValue({
          id: '1',
          status: 'DRAFT',
          ownerId: 'other',
        } as any);
      await expect(service.findOne('1', 'user', 'STUDENT')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('resets status to READY_FOR_REVIEW if it was published', async () => {
      jest
        .spyOn(prisma.opportunity, 'findUnique')
        .mockResolvedValue({
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

    it('updates status and sends notification if user is MODERATOR', async () => {
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user1', role: 'MODERATOR' } as any);
      jest
        .spyOn(prisma.opportunity, 'update')
        .mockResolvedValue({
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
