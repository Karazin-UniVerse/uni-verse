import { Test, TestingModule } from '@nestjs/testing';
import { MoodleProfileService } from './moodle-profile.service';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { MoodleCoursesService } from '../moodle-courses/moodle-courses.service';
import { MoodleGradesService } from '../moodle-grades/moodle-grades.service';

describe('MoodleProfileService', () => {
  let service: MoodleProfileService;
  let mockMoodleClient: { client: jest.Mock };
  let mockCoursesService: { getCourses: jest.Mock };
  let mockGradesService: { getGeneralGrades: jest.Mock };

  beforeEach(async () => {
    mockMoodleClient = {
      client: jest.fn(),
    };
    mockCoursesService = {
      getCourses: jest.fn().mockResolvedValue([
        { id: 1, fullname: 'Course 1' },
        { id: 2, fullname: 'Course 2' },
      ]),
    };
    mockGradesService = {
      getGeneralGrades: jest.fn().mockResolvedValue({
        grades: [
          { courseId: 1, grade: '95' },
          { courseId: 2, grade: '85' },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleProfileService,
        {
          provide: MoodleClientService,
          useValue: mockMoodleClient,
        },
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

    service = module.get<MoodleProfileService>(MoodleProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch Moodle site info and build profile with calculated GPA and credits', async () => {
    mockMoodleClient.client.mockImplementation(async (wsfunction: string) => {
      if (wsfunction === 'core_webservice_get_site_info') {
        return {
          fullname: 'Іван Петренко',
          username: 'ivan.petrenko',
          userid: 5001,
          userpictureurl: 'https://moodle.test/pic.jpg',
        };
      }

      if (wsfunction === 'core_user_get_users_by_field') {
        return [
          {
            id: 5001,
            email: 'ivan.petrenko@student.karazin.ua',
            department: 'Кафедра системного аналізу',
            institution: 'Факультет компʼютерних наук',
            idnumber: 'KB-99998888',
          },
        ];
      }

      return null;
    });

    const profile = await service.getProfile(
      'valid-token',
      '5001',
      'ivan.petrenko@student.karazin.ua',
    );

    expect(profile.fullName).toBe('Іван Петренко');
    expect(profile.email).toBe('ivan.petrenko@student.karazin.ua');
    expect(profile.avatarUrl).toBe('https://moodle.test/pic.jpg');
    expect(profile.studentCardNumber).toBe('KB-99998888');
    expect(profile.faculty).toBe('Факультет компʼютерних наук');
    expect(profile.department).toBe('Кафедра системного аналізу');
    expect(profile.gpa).toBe(90);
    expect(profile.totalCreditsEarned).toBe(10);
    expect(profile.academicStanding).toBe('honors');
  });

  it('should handle Moodle errors gracefully and fall back to defaults', async () => {
    mockMoodleClient.client.mockRejectedValue(new Error('Moodle unreachable'));
    mockCoursesService.getCourses.mockRejectedValue(new Error('Network error'));
    mockGradesService.getGeneralGrades.mockRejectedValue(
      new Error('Network error'),
    );

    const profile = await service.getProfile(
      'token',
      '4021',
      'fallback@karazin.ua',
    );

    expect(profile.fullName).toBe('Барсуков Родіон Сергійович');
    expect(profile.email).toBe('fallback@karazin.ua');
    expect(profile.moodleId).toBe(4021);
    expect(profile.status).toBe('active');
  });

  it('should handle site info with firstname and lastname when fullname is missing', async () => {
    mockMoodleClient.client.mockImplementation(async (wsfunction: string) => {
      if (wsfunction === 'core_webservice_get_site_info') {
        return {
          firstname: 'Олена',
          lastname: 'Коваленко',
          username: 'olena.kovalenko',
          userid: 6001,
        };
      }

      return [];
    });

    const profile = await service.getProfile('token', '6001');

    expect(profile.fullName).toBe('Коваленко Олена');
    expect(profile.email).toBe('olena.kovalenko@student.karazin.ua');
  });

  it('should catch synchronous error when computing GPA/credits', async () => {
    mockCoursesService.getCourses.mockImplementationOnce(() => {
      throw new Error('Sync computation failure');
    });

    const profile = await service.getProfile('token', '4021');

    expect(profile.gpa).toBe(92.4);
    expect(profile.totalCreditsEarned).toBe(120);
  });
});
