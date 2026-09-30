import { Test, TestingModule } from '@nestjs/testing';
import { MoodleCoursesService } from './moodle-courses.service';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { BadRequestException } from '@nestjs/common';

describe('MoodleCoursesService', () => {
  let service: MoodleCoursesService;
  const mockMoodleClientService = {
    client: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleCoursesService,
        {
          provide: MoodleClientService,
          useValue: mockMoodleClientService,
        },
      ],
    }).compile();

    service = module.get<MoodleCoursesService>(MoodleCoursesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCourses', () => {
    it('should throw BadRequestException if token or moodleId is missing', async () => {
      await expect(service.getCourses('', '123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getCourses('token', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty list if response is not an array', async () => {
      mockMoodleClientService.client.mockResolvedValue(null);
      const result = await service.getCourses('token', '123');

      expect(result).toEqual([]);
    });

    it('should return normalized courses on success', async () => {
      mockMoodleClientService.client.mockResolvedValue([
        {
          id: 101,
          fullname: 'Computer Science',
          shortname: 'CS',
          summary: '<p>Course summary</p>',
          progress: 80,
        },
      ]);

      const result = await service.getCourses('token', '123');

      expect(result).toEqual([
        {
          id: 101,
          fullname: 'Computer Science',
          shortname: 'CS',
          summary: 'Course summary',
          progress: 80,
        },
      ]);
    });

    it('should catch errors, log them, and return empty list', async () => {
      mockMoodleClientService.client.mockRejectedValue(
        new Error('Network failure'),
      );
      const result = await service.getCourses('token', '123');

      expect(result).toEqual([]);
    });
  });
});
