import { Test, TestingModule } from '@nestjs/testing';
import { MoodleCourseContentsService } from './moodle-course-contents.service';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { BadRequestException } from '@nestjs/common';

describe('MoodleCourseContentsService', () => {
  let service: MoodleCourseContentsService;

  const mockMoodleClientService = {
    client: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleCourseContentsService,
        { provide: MoodleClientService, useValue: mockMoodleClientService },
      ],
    }).compile();

    service = module.get<MoodleCourseContentsService>(
      MoodleCourseContentsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCourseContents', () => {
    it('should throw BadRequestException if token is missing', async () => {
      await expect(service.getCourseContents('', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should fetch contents', async () => {
      mockMoodleClientService.client.mockResolvedValue([{}]);
      const result = await service.getCourseContents('token', 1);

      expect(result).toHaveLength(1);
    });
  });
});
