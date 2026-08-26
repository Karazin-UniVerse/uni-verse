import { Test, TestingModule } from '@nestjs/testing';
import { MoodleStatisticsService } from './moodle-statistics.service';
import { MoodleCoursesService } from '../moodle-courses/moodle-courses.service';

describe('MoodleStatisticsService', () => {
  let service: MoodleStatisticsService;

  const mockCoursesService = {
    getCourses: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleStatisticsService,
        { provide: MoodleCoursesService, useValue: mockCoursesService },
      ],
    }).compile();

    service = module.get<MoodleStatisticsService>(MoodleStatisticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatistics', () => {
    it('should return count of courses', async () => {
      mockCoursesService.getCourses.mockResolvedValue([{}, {}]);
      const result = await service.getStatistics('token', 'id');
      expect(result.total).toBe(2);
    });
  });
});
