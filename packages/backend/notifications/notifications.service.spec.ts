import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

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
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('creates and returns a notification', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Title',
        message: 'Message',
        link: '/test',
        isRead: false,
      };

      (prisma.notification.create as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      const result = await service.createNotification({
        userId: 'user-1',
        title: 'Title',
        message: 'Message',
        link: '/test',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Title',
          message: 'Message',
          link: '/test',
        },
      });
      expect(result).toEqual(mockNotification);
    });
  });

  describe('getMyNotifications', () => {
    it('returns notifications for a user ordered by createdAt desc', async () => {
      const mockList = [{ id: 'notif-1', userId: 'user-1' }];

      (prisma.notification.findMany as jest.Mock).mockResolvedValue(mockList);

      const result = await service.getMyNotifications('user-1');

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('markAsRead', () => {
    it('throws NotFoundException if notification is not found', async () => {
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.markAsRead('user-1', 'notif-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('marks notification as read and returns updated notification', async () => {
      const existing = { id: 'notif-1', userId: 'user-1', isRead: false };
      const updated = { ...existing, isRead: true };

      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.notification.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.markAsRead('user-1', 'notif-1');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read', async () => {
      const mockResult = { count: 3 };

      (prisma.notification.updateMany as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const result = await service.markAllAsRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
      expect(result).toEqual(mockResult);
    });
  });
});
