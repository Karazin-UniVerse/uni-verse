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

    it('should forward the event url and formatted time', async () => {
      mockMoodleClientService.client.mockResolvedValue({
        events: [
          {
            id: 2,
            name: 'Lecture',
            timestart: 200,
            eventtype: 'course',
            url: 'https://moodle.example/event/2',
            formattedtime: '<span>10:00</span>',
          },
        ],
      });
      const result = await service.getUpcomingEvents('token', 'id');

      expect(result[0].url).toBe('https://moodle.example/event/2');
      expect(result[0].formattedtime).toBe('<span>10:00</span>');
    });

    it('should catch errors, log them, and return empty list', async () => {
      mockMoodleClientService.client.mockRejectedValue(
        new Error('Network failure'),
      );
      const result = await service.getUpcomingEvents('token', 'id');

      expect(result).toEqual([]);
    });
  });
});
