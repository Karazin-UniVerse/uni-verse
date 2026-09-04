import { Test, TestingModule } from '@nestjs/testing';
import { MoodleEventsService } from './moodle-events.service';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { BadRequestException } from '@nestjs/common';

describe('MoodleEventsService', () => {
  let service: MoodleEventsService;

  const mockMoodleClientService = {
    client: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleEventsService,
        { provide: MoodleClientService, useValue: mockMoodleClientService },
      ],
    }).compile();

    service = module.get<MoodleEventsService>(MoodleEventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUpcomingEvents', () => {
    it('should throw BadRequestException if token or moodleId is missing', async () => {
      await expect(service.getUpcomingEvents('', 'id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getUpcomingEvents('token', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty array if no events', async () => {
      mockMoodleClientService.client.mockResolvedValue({});
      const result = await service.getUpcomingEvents('token', 'id');

      expect(result).toEqual([]);
    });

    it('should return parsed events', async () => {
      mockMoodleClientService.client.mockResolvedValue({
        events: [
          {
            id: 1,
            name: 'Event',
            timestart: 100,
            eventtype: 'test',
            course: { fullname: 'C' },
          },
        ],
      });
      const result = await service.getUpcomingEvents('token', 'id');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Event');
      expect(result[0].courseName).toBe('C');
    });
  });
});
