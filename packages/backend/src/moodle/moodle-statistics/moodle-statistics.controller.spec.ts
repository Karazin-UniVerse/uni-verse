import { Test, TestingModule } from '@nestjs/testing';
import { MoodleStatisticsController } from './moodle-statistics.controller';
import { MoodleStatisticsService } from './moodle-statistics.service';

describe('MoodleStatisticsController', () => {
  let controller: MoodleStatisticsController;

  const mockService = {
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoodleStatisticsController],
      providers: [{ provide: MoodleStatisticsService, useValue: mockService }],
    }).compile();

    controller = module.get<MoodleStatisticsController>(
      MoodleStatisticsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
