import { Test, TestingModule } from '@nestjs/testing';
import { MoodleEventsController } from './moodle-events.controller';
import { MoodleEventsService } from './moodle-events.service';

describe('MoodleEventsController', () => {
  let controller: MoodleEventsController;

  const mockService = {
    getUpcomingEvents: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoodleEventsController],
      providers: [{ provide: MoodleEventsService, useValue: mockService }],
    }).compile();

    controller = module.get<MoodleEventsController>(MoodleEventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
