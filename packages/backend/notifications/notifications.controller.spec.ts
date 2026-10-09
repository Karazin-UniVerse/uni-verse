import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ForbiddenException } from '@nestjs/common';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            getMyNotifications: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyNotifications', () => {
    it('throws ForbiddenException if userId is missing', async () => {
      await expect(controller.getMyNotifications('')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.getMyNotifications', async () => {
      const mockResult = [{ id: 'notif-1' }] as any;

      (service.getMyNotifications as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.getMyNotifications('user-1');

      expect(service.getMyNotifications).toHaveBeenCalledWith('user-1');
      expect(result).toBe(mockResult);
    });
  });

  describe('markAsRead', () => {
    it('throws ForbiddenException if userId is missing', async () => {
      await expect(controller.markAsRead('', 'notif-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.markAsRead', async () => {
      const mockResult = { id: 'notif-1', isRead: true } as any;

      (service.markAsRead as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.markAsRead('user-1', 'notif-1');

      expect(service.markAsRead).toHaveBeenCalledWith('user-1', 'notif-1');
      expect(result).toBe(mockResult);
    });
  });

  describe('markAllAsRead', () => {
    it('throws ForbiddenException if userId is missing', async () => {
      await expect(controller.markAllAsRead('')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('delegates to service.markAllAsRead', async () => {
      const mockResult = { count: 5 };

      (service.markAllAsRead as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.markAllAsRead('user-1');

      expect(service.markAllAsRead).toHaveBeenCalledWith('user-1');
      expect(result).toBe(mockResult);
    });
  });
});
