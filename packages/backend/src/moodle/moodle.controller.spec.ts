import { Test, TestingModule } from '@nestjs/testing';
import { MoodleController } from './moodle.controller';
import { MoodleCoursesService } from './moodle-courses/moodle-courses.service';
import { MoodleGradesService } from './moodle-grades/moodle-grades.service';

describe('MoodleController', () => {
  let controller: MoodleController;
  let mockCoursesService: { getCourses: jest.Mock };
  let mockGradesService: { getGeneralGrades: jest.Mock };

  beforeEach(async () => {
    mockCoursesService = {
      getCourses: jest.fn(),
    };

    mockGradesService = {
      getGeneralGrades: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoodleController],
      providers: [
        {
          provide: MoodleCoursesService,
          useValue: mockCoursesService,
        },
        {
          provide: MoodleGradesService,
          useValue: mockGradesService,
        },
      ],
    }).compile();

    controller = module.get<MoodleController>(MoodleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call moodleCoursesService.getCourses', async () => {
    mockCoursesService.getCourses.mockResolvedValueOnce([
      { id: 1, fullname: 'Course 1' },
    ]);
    const res = await controller.getCourses('42', 'token');
    expect(mockCoursesService.getCourses).toHaveBeenCalledWith('token', '42');
    expect(res).toEqual([{ id: 1, fullname: 'Course 1' }]);
  });

  it('should call moodleGradesService.getGeneralGrades', async () => {
    const mockGradesRes = {
      grades: [{ courseId: 1, courseName: 'Course 1', grade: '90.00' }],
    };
    mockGradesService.getGeneralGrades.mockResolvedValueOnce(mockGradesRes);

    const res = await controller.getGrades('42', 'token');
    expect(mockGradesService.getGeneralGrades).toHaveBeenCalledWith(
      'token',
      '42',
    );
    expect(res).toEqual(mockGradesRes);
  });
});
