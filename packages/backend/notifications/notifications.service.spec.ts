import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const dto = {
        userId: '1',
        title: 'Test',
        message: 'Test Msg',
        link: '/test',
      };
      const mockNotif = {
        id: 'n1',
        ...dto,
        isRead: false,
        createdAt: new Date(),
      };

      jest
        .mocked(prismaService.notification.create)
        .mockResolvedValue(mockNotif as any);

      const result = await service.createNotification(dto);

      expect(result).toEqual(mockNotif);
      expect(prismaService.notification.create).toHaveBeenCalledWith({
        data: dto,
      });
    });
  });

  describe('getMyNotifications', () => {
    it('should return user notifications', async () => {
      const mockNotifs = [
        { id: 'n1', userId: '1', title: 'Test', message: 'Msg', isRead: false },
      ];

      jest
        .mocked(prismaService.notification.findMany)
        .mockResolvedValue(mockNotifs as any);

      const result = await service.getMyNotifications('1');

      expect(result).toEqual(mockNotifs);
      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: '1' } }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if not found', async () => {
      jest.mocked(prismaService.notification.findFirst).mockResolvedValue(null);

      await expect(service.markAsRead('1', 'n1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update and return notification', async () => {
      const mockNotif = { id: 'n1', userId: '1', title: 'Test', isRead: false };

      jest
        .mocked(prismaService.notification.findFirst)
        .mockResolvedValue(mockNotif as any);
      jest
        .mocked(prismaService.notification.update)
        .mockResolvedValue({ ...mockNotif, isRead: true } as any);

      const result = await service.markAsRead('1', 'n1');

      expect(result.isRead).toBe(true);
      expect(prismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { isRead: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for a user', async () => {
      jest
        .mocked(prismaService.notification.updateMany)
        .mockResolvedValue({ count: 2 } as any);

      const result = await service.markAllAsRead('1');

      expect(result).toEqual({ count: 2 });
      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: '1', isRead: false },
        data: { isRead: true },
      });
    });
  });
});
