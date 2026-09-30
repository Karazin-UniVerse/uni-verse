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

  it('should fetch Moodle site info and build profile with calculated GPA and credits (honors)', async () => {
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
    expect(profile.recordBookNumber).toBe('ЗК-KB-99998888');
    expect(profile.faculty).toBe('Факультет компʼютерних наук');
    expect(profile.department).toBe('Кафедра системного аналізу');
    expect(profile.gpa).toBe(90);
    expect(profile.totalCreditsEarned).toBe(10);
    expect(profile.academicStanding).toBe('honors');
    expect(profile.moodleId).toBe(5001);
  });

  it('should calculate GPA < 90 and set standing to good', async () => {
    mockMoodleClient.client.mockResolvedValue({});
    mockGradesService.getGeneralGrades.mockResolvedValue({
      grades: [
        { courseId: 1, grade: '75' },
        { courseId: 2, grade: '80' },
      ],
    });

    const profile = await service.getProfile('token', '4021');

    expect(profile.gpa).toBe(77.5);
    expect(profile.academicStanding).toBe('good');
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
    expect(profile.avatarUrl).toBe(
      'https://moodle.universemvp.tech/user/pix.php/4021/f1.jpg',
    );
    expect(profile.studentCardNumber).toBe('КВ-00004021');
    expect(profile.recordBookNumber).toBe('ЗК-2024-021');
    expect(profile.moodleId).toBe(4021);
    expect(profile.status).toBe('active');
    expect(profile.faculty).toBe('ННІ Компʼютерних наук та штучного інтелекту');
    expect(profile.department).toBe(
      'Кафедра математичного моделювання та аналізу даних',
    );
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
    expect(profile.studentCardNumber).toBe('КВ-00006001');
    expect(profile.recordBookNumber).toBe('ЗК-2024-001');
  });

  it('should fall back to moodleUser fullname and profileimageurl when siteInfo names are missing', async () => {
    mockMoodleClient.client.mockImplementation(async (wsfunction: string) => {
      if (wsfunction === 'core_webservice_get_site_info') {
        return {};
      }

      if (wsfunction === 'core_user_get_users_by_field') {
        return [
          {
            fullname: 'Тарас Шевченко',
            profileimageurl: 'https://moodle.test/taras.jpg',
            department: 'Кафедра українознавства',
          },
        ];
      }

      return null;
    });

    const profile = await service.getProfile('token', '7001');

    expect(profile.fullName).toBe('Тарас Шевченко');
    expect(profile.avatarUrl).toBe('https://moodle.test/taras.jpg');
    expect(profile.faculty).toBe('Кафедра українознавства');
  });

  it('should handle empty/non-numeric moodleId and empty string fallbacks', async () => {
    mockMoodleClient.client.mockResolvedValue({});
    mockCoursesService.getCourses.mockResolvedValue([]);
    mockGradesService.getGeneralGrades.mockResolvedValue({ grades: [] });

    const profile = await service.getProfile('token', '');

    expect(profile.id).toBe('moodle-4021');
    expect(profile.moodleId).toBe(4021);
    expect(profile.studentCardNumber).toBe('КВ-10293847');
    expect(profile.recordBookNumber).toBe('ЗК-2024-042');
    expect(profile.email).toBe('student@karazin.ua');
    expect(profile.totalCreditsEarned).toBe(120);
    expect(profile.gpa).toBe(92.4);
  });

  it('should handle non-numeric moodleId by falling back to default id 4021', async () => {
    mockMoodleClient.client.mockResolvedValue({});
    const profile = await service.getProfile('token', 'not-a-number');

    expect(profile.moodleId).toBe(4021);
    expect(profile.id).toBe('moodle-not-a-number');
  });

  it('should handle invalid or zero grades by preserving default GPA', async () => {
    mockMoodleClient.client.mockResolvedValue({});
    mockGradesService.getGeneralGrades.mockResolvedValue({
      grades: [
        { grade: null },
        { grade: 'NaN' },
        { grade: 0 },
        { grade: '-10' },
      ],
    });

    const profile = await service.getProfile('token', '4021');

    expect(profile.gpa).toBe(92.4);
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
