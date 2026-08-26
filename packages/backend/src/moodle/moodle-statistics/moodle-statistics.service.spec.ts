import { Test, TestingModule } from '@nestjs/testing';
import { MoodleStatisticsService } from './moodle-statistics.service';
import { MoodleCoursesService } from '../moodle-courses/moodle-courses.service';

describe('MoodleStatisticsService', () => {
  let service: MoodleStatisticsService;

  const MOCK_COURSES_SERVICE = {
    getCourses: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleStatisticsService,
        { provide: MoodleCoursesService, useValue: MOCK_COURSES_SERVICE },
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
      MOCK_COURSES_SERVICE.getCourses.mockResolvedValue([{}, {}]);
      const result = await service.getStatistics('token', 'id');
      expect(result.total).toBe(2);
    });
  });
});
