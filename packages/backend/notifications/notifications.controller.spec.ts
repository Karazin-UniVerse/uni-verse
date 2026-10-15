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
    it('should throw ForbiddenException if no userId', () => {
      expect(() => controller.getMyNotifications('')).toThrow(
        ForbiddenException,
      );
    });

    it('should return user notifications', async () => {
      const mockNotifs = [{ id: 'n1', title: 'Test' }];

      jest
        .mocked(service.getMyNotifications)
        .mockResolvedValue(mockNotifs as any);

      const result = await controller.getMyNotifications('1');

      expect(result).toEqual(mockNotifs);
      expect(service.getMyNotifications).toHaveBeenCalledWith('1');
    });
  });

  describe('markAsRead', () => {
    it('should throw ForbiddenException if no userId', () => {
      expect(() => controller.markAsRead('', 'n1')).toThrow(ForbiddenException);
    });

    it('should call markAsRead on service', async () => {
      const mockNotif = { id: 'n1', isRead: true };

      jest.mocked(service.markAsRead).mockResolvedValue(mockNotif as any);

      const result = await controller.markAsRead('1', 'n1');

      expect(result).toEqual(mockNotif);
      expect(service.markAsRead).toHaveBeenCalledWith('1', 'n1');
    });
  });

  describe('markAllAsRead', () => {
    it('should throw ForbiddenException if no userId', () => {
      expect(() => controller.markAllAsRead('')).toThrow(ForbiddenException);
    });

    it('should call markAllAsRead on service', async () => {
      jest.mocked(service.markAllAsRead).mockResolvedValue({ count: 5 } as any);

      const result = await controller.markAllAsRead('1');

      expect(result).toEqual({ count: 5 });
      expect(service.markAllAsRead).toHaveBeenCalledWith('1');
    });
  });
});
