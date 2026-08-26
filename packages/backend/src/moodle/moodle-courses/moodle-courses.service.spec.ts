import { Test, TestingModule } from '@nestjs/testing';
import { MoodleCoursesService } from './moodle-courses.service';
import { MoodleClientService } from '../moodle-client/moodle.client.service';

describe('MoodleCoursesService', () => {
  let service: MoodleCoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleCoursesService,
        {
          provide: MoodleClientService,
          useValue: {
            client: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MoodleCoursesService>(MoodleCoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
