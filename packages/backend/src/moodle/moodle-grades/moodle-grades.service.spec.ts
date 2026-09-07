import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  MoodleGradesService,
  parseGradeScore,
  detectControlType,
} from './moodle-grades.service';
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
      expect(grade1.totalScore).toBe(95);
      expect(grade1.score).toBe(95);
      expect(grade1.ectsGrade).toBe('A');
      expect(grade1.traditionalGrade).toBe('відмінно');
      expect(grade1.isPassed).toBe(true);
      expect(grade1.controlType).toBe('exam');
      expect(grade1.year).toBe('2025/2026');
      expect(grade1.academicYear).toBe('2025/2026');
      expect(grade1.semester).toBe(2);

      const grade2 = result.grades[1];

      expect(grade2.courseId).toBe(102);
      expect(grade2.grade).toBe('75.00');
      expect(grade2.rawGrade).toBe('75.00000');
      expect(grade2.totalScore).toBe(75);
      expect(grade2.score).toBe(75);
      expect(grade2.ectsGrade).toBe('C');
      expect(grade2.traditionalGrade).toBe('добре');
      expect(grade2.isPassed).toBe(true);
      expect(grade2.year).toBe('2025/2026');
      expect(grade2.semester).toBe(1);
    });

    it('should compute correct grades for credit, failing, and missing scores', async () => {
      const mockGradesResponse = {
        grades: [
          { courseid: 201, grade: '82.00', rawgrade: '82.00000' }, // B, добре, exam
          { courseid: 202, grade: '65.00', rawgrade: '65.00000' }, // D, задовільно, exam
          { courseid: 203, grade: '55.00', rawgrade: '55.00000' }, // Fx, незадовільно, fail
          { courseid: 204, grade: '30.00', rawgrade: '30.00000' }, // F, незадовільно, fail
          { courseid: 205, grade: '75.00', rawgrade: '75.00000' }, // C, credit -> зараховано
          { courseid: 206, grade: '45.00', rawgrade: '45.00000' }, // Fx, credit -> не зараховано
          { courseid: 207, grade: '-', rawgrade: null }, // no score -> 0, F, незадовільно
        ],
      };

      const mockCoursesResponse = [
        { id: 201, fullname: 'Алгоритми та структури даних (іспит)' },
        { id: 202, fullname: 'Архітектура комп’ютерів' },
        { id: 203, fullname: 'Математичний аналіз' },
        { id: 204, fullname: 'Лінійна алгебра' },
        { id: 205, fullname: 'Фізичне виховання (залік)' },
        { id: 206, fullname: 'Іноземна мова (залік)' },
        { id: 207, fullname: 'Веб-технології' },
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

      expect(result.grades).toHaveLength(7);

      // 201: 82 -> B, добре
      expect(result.grades[0].totalScore).toBe(82);
      expect(result.grades[0].ectsGrade).toBe('B');
      expect(result.grades[0].traditionalGrade).toBe('добре');
      expect(result.grades[0].isPassed).toBe(true);

      // 202: 65 -> D, задовільно
      expect(result.grades[1].totalScore).toBe(65);
      expect(result.grades[1].ectsGrade).toBe('D');
      expect(result.grades[1].traditionalGrade).toBe('задовільно');
      expect(result.grades[1].isPassed).toBe(true);

      // 203: 55 -> Fx, незадовільно
      expect(result.grades[2].totalScore).toBe(55);
      expect(result.grades[2].ectsGrade).toBe('Fx');
      expect(result.grades[2].traditionalGrade).toBe('незадовільно');
      expect(result.grades[2].isPassed).toBe(false);

      // 204: 30 -> F, незадовільно
      expect(result.grades[3].totalScore).toBe(30);
      expect(result.grades[3].ectsGrade).toBe('F');
      expect(result.grades[3].traditionalGrade).toBe('незадовільно');
      expect(result.grades[3].isPassed).toBe(false);

      // 205: 75 credit -> C, зараховано
      expect(result.grades[4].controlType).toBe('credit');
      expect(result.grades[4].totalScore).toBe(75);
      expect(result.grades[4].ectsGrade).toBe('C');
      expect(result.grades[4].traditionalGrade).toBe('зараховано');
      expect(result.grades[4].isPassed).toBe(true);

      // 206: 45 credit -> Fx, не зараховано
      expect(result.grades[5].controlType).toBe('credit');
      expect(result.grades[5].totalScore).toBe(45);
      expect(result.grades[5].ectsGrade).toBe('Fx');
      expect(result.grades[5].traditionalGrade).toBe('не зараховано');
      expect(result.grades[5].isPassed).toBe(false);

      // 207: '-' -> 0, F, незадовільно
      expect(result.grades[6].totalScore).toBe(0);
      expect(result.grades[6].ectsGrade).toBe('F');
      expect(result.grades[6].traditionalGrade).toBe('незадовільно');
      expect(result.grades[6].isPassed).toBe(false);
    });

    it('should handle empty grades list gracefully', async () => {
      mockMoodleClient.client.mockResolvedValueOnce({ grades: [] });
      mockMoodleClient.client.mockResolvedValueOnce([]);

      const result = await service.getGeneralGrades('valid_token', '42');

      expect(result.grades).toEqual([]);
    });
  });

  describe('parseGradeScore', () => {
    it('should parse rawGrade string or number', () => {
      expect(parseGradeScore('95.50000', '95.50')).toBe(95.5);
      expect(parseGradeScore(85, '85.00')).toBe(85);
      expect(parseGradeScore('100.000', null)).toBe(100);
    });

    it('should fallback to grade if rawGrade is invalid', () => {
      expect(parseGradeScore(null, '78.25')).toBe(78.25);
      expect(parseGradeScore('-', '64.00')).toBe(64);
    });

    it('should return 0 when both are missing or invalid', () => {
      expect(parseGradeScore(null, null)).toBe(0);
      expect(parseGradeScore('-', '-')).toBe(0);
      expect(parseGradeScore('', '')).toBe(0);
      expect(parseGradeScore('invalid', 'n/a')).toBe(0);
    });

    it('should clamp values between 0 and 100', () => {
      expect(parseGradeScore('120', null)).toBe(100);
      expect(parseGradeScore('-15', null)).toBe(0);
    });
  });

  describe('detectControlType', () => {
    it('should detect credit courses', () => {
      expect(detectControlType('Фізичне виховання (залік)')).toBe('credit');
      expect(detectControlType('English (credit)')).toBe('credit');
      expect(detectControlType('Залік з програмування')).toBe('credit');
    });

    it('should detect differentiated credit courses', () => {
      expect(
        detectControlType('Виробнича практика (диференційований залік)'),
      ).toBe('differentiated_credit');
      expect(detectControlType('Practice (differentiated credit)')).toBe(
        'differentiated_credit',
      );
    });

    it('should default to exam', () => {
      expect(detectControlType('Математичний аналіз')).toBe('exam');
      expect(detectControlType('Бази даних (іспит)')).toBe('exam');
      expect(detectControlType(undefined, undefined)).toBe('exam');
    });
  });
});
