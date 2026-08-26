import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MoodleGradesService } from './moodle-grades.service';
import { MoodleClientService } from '../moodle-client/moodle.client.service';

describe('MoodleGradesService', () => {
  let service: MoodleGradesService;
  let mockMoodleClient: { client: jest.Mock };

  beforeEach(async () => {
    mockMoodleClient = {
      client: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleGradesService,
        {
          provide: MoodleClientService,
          useValue: mockMoodleClient,
        },
      ],
    }).compile();

    service = module.get<MoodleGradesService>(MoodleGradesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGeneralGrades', () => {
    it('should throw BadRequestException if token or moodleId are missing', async () => {
      await expect(service.getGeneralGrades('', '123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getGeneralGrades('token', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return mapped grades with course names', async () => {
      const mockGradesResponse = {
        grades: [
          { courseid: 101, grade: '95.00', rawgrade: '95.00000' },
          { courseid: 102, grade: '75.00', rawgrade: '75.00000' },
        ],
      };

      const mockCoursesResponse = [
        {
          id: 101,
          fullname: "Об'єктно-орієнтоване програмування 2025/2026 сем 2",
          shortname: 'ООП-26',
        },
        { id: 102, fullname: 'Бази даних 2025-2026 sem 1', shortname: 'БД-26' },
      ];

      mockMoodleClient.client.mockImplementation((wsfunction: string) => {
        if (wsfunction === 'gradereport_overview_get_course_grades') {
          return Promise.resolve(mockGradesResponse);
        }
        if (wsfunction === 'core_enrol_get_users_courses') {
          return Promise.resolve(mockCoursesResponse);
        }
        return Promise.resolve(null);
      });

      const result = await service.getGeneralGrades('valid_token', '42');

      expect(result).toBeDefined();
      expect(result.grades).toHaveLength(2);

      const grade1 = result.grades[0];
      expect(grade1.courseId).toBe(101);
      expect(grade1.courseName).toBe(
        "Об'єктно-орієнтоване програмування 2025/2026 сем 2",
      );
      expect(grade1.grade).toBe('95.00');
      expect(grade1.rawGrade).toBe('95.00000');
      expect(grade1.year).toBe('2025/2026');
      expect(grade1.semester).toBe(2);

      const grade2 = result.grades[1];
      expect(grade2.courseId).toBe(102);
      expect(grade2.grade).toBe('75.00');
      expect(grade2.rawGrade).toBe('75.00000');
      expect(grade2.year).toBe('2025/2026');
      expect(grade2.semester).toBe(1);
    });

    it('should handle empty grades list gracefully', async () => {
      mockMoodleClient.client.mockResolvedValueOnce({ grades: [] });
      mockMoodleClient.client.mockResolvedValueOnce([]);

      const result = await service.getGeneralGrades('valid_token', '42');

      expect(result.grades).toEqual([]);
    });
  });
});
