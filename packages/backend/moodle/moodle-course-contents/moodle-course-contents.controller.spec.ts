import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
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
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn() } },
        },
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn() } },
        },
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
