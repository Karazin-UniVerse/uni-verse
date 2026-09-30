import { Test, TestingModule } from '@nestjs/testing';
import { MoodleCourseContentsController } from './moodle-course-contents.controller';
import { MoodleCourseContentsService } from './moodle-course-contents.service';

describe('MoodleCourseContentsController', () => {
  let controller: MoodleCourseContentsController;

  const mockService = {
    getCourseContents: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoodleCourseContentsController],
      providers: [
        { provide: MoodleCourseContentsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<MoodleCourseContentsController>(
      MoodleCourseContentsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
