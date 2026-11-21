import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MoodleNotificationsController } from './moodle-notifications.controller';
import { MoodleNotificationsService } from './moodle-notifications.service';

describe('MoodleNotificationsController', () => {
  let controller: MoodleNotificationsController;

  const mockService = {
    getNotifications: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoodleNotificationsController],
      providers: [
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn() } },
        },
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn() } },
        },
        { provide: MoodleNotificationsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<MoodleNotificationsController>(
      MoodleNotificationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
