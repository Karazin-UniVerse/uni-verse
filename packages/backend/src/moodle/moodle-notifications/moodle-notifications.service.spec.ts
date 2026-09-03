import { Test, TestingModule } from '@nestjs/testing';
import { MoodleNotificationsService } from './moodle-notifications.service';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { BadRequestException } from '@nestjs/common';

describe('MoodleNotificationsService', () => {
  let service: MoodleNotificationsService;

  const mockMoodleClientService = {
    client: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleNotificationsService,
        { provide: MoodleClientService, useValue: mockMoodleClientService },
      ],
    }).compile();

    service = module.get<MoodleNotificationsService>(
      MoodleNotificationsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should throw BadRequestException if token or moodleId is missing', async () => {
      await expect(service.getNotifications('', 'id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getNotifications('token', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty list if no data', async () => {
      mockMoodleClientService.client.mockResolvedValue({});
      const result = await service.getNotifications('token', 'id');

      expect(result.notifications).toEqual([]);
      expect(result.unreadcount).toBe(0);
    });
  });
});
