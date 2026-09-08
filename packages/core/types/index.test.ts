import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  calculateEctsGrade,
  calculateTraditionalGrade,
  type AssignmentItem,
  type Course,
  type CurriculumItem,
  type GradeRecord,
  type LmsConnectionStatus,
  type ScheduleItem,
  type StudentProfile,
  type StudentRecordBookItem,
} from './index.ts';

describe('calculateEctsGrade', () => {
  test('assigns A for scores >= 90', () => {
    assert.strictEqual(calculateEctsGrade(100), 'A');
    assert.strictEqual(calculateEctsGrade(95), 'A');
    assert.strictEqual(calculateEctsGrade(90), 'A');
  });

  test('assigns B for scores in range [82, 90)', () => {
    assert.strictEqual(calculateEctsGrade(89.9), 'B');
    assert.strictEqual(calculateEctsGrade(85), 'B');
    assert.strictEqual(calculateEctsGrade(82), 'B');
  });

  test('assigns C for scores in range [74, 82)', () => {
    assert.strictEqual(calculateEctsGrade(81.9), 'C');
    assert.strictEqual(calculateEctsGrade(78), 'C');
    assert.strictEqual(calculateEctsGrade(74), 'C');
  });

  test('assigns D for scores in range [64, 74)', () => {
    assert.strictEqual(calculateEctsGrade(73.9), 'D');
    assert.strictEqual(calculateEctsGrade(68), 'D');
    assert.strictEqual(calculateEctsGrade(64), 'D');
  });

  test('assigns E for scores in range [60, 64)', () => {
    assert.strictEqual(calculateEctsGrade(63.9), 'E');
    assert.strictEqual(calculateEctsGrade(62), 'E');
    assert.strictEqual(calculateEctsGrade(60), 'E');
  });

  test('assigns Fx for scores in range [35, 60)', () => {
    assert.strictEqual(calculateEctsGrade(59.9), 'Fx');
    assert.strictEqual(calculateEctsGrade(45), 'Fx');
    assert.strictEqual(calculateEctsGrade(35), 'Fx');
  });

  test('assigns F for scores < 35', () => {
    assert.strictEqual(calculateEctsGrade(34.9), 'F');
    assert.strictEqual(calculateEctsGrade(20), 'F');
    assert.strictEqual(calculateEctsGrade(0), 'F');
  });
});

describe('calculateTraditionalGrade', () => {
  describe('exam grading', () => {
    test('assigns відмінно for score >= 90', () => {
      assert.strictEqual(calculateTraditionalGrade(100), 'відмінно');
      assert.strictEqual(calculateTraditionalGrade(90, 'exam'), 'відмінно');
    });

    test('assigns добре for score in range [74, 90)', () => {
      assert.strictEqual(calculateTraditionalGrade(89.9, 'exam'), 'добре');
      assert.strictEqual(calculateTraditionalGrade(74, 'exam'), 'добре');
    });

    test('assigns задовільно for score in range [60, 74)', () => {
      assert.strictEqual(calculateTraditionalGrade(73.9, 'exam'), 'задовільно');
      assert.strictEqual(calculateTraditionalGrade(60, 'exam'), 'задовільно');
    });

    test('assigns незадовільно for score < 60', () => {
      assert.strictEqual(calculateTraditionalGrade(59.9, 'exam'), 'незадовільно');
      assert.strictEqual(calculateTraditionalGrade(30, 'exam'), 'незадовільно');
      assert.strictEqual(calculateTraditionalGrade(0, 'exam'), 'незадовільно');
    });
  });

  describe('credit grading', () => {
    test('assigns зараховано for score >= 60', () => {
      assert.strictEqual(calculateTraditionalGrade(100, 'credit'), 'зараховано');
      assert.strictEqual(calculateTraditionalGrade(60, 'credit'), 'зараховано');
    });

    test('assigns не зараховано for score < 60', () => {
      assert.strictEqual(calculateTraditionalGrade(59.9, 'credit'), 'не зараховано');
      assert.strictEqual(calculateTraditionalGrade(0, 'credit'), 'не зараховано');
    });
  });

  describe('differentiated credit grading', () => {
    test('uses standard multi-tier marks for differentiated_credit', () => {
      assert.strictEqual(calculateTraditionalGrade(95, 'differentiated_credit'), 'відмінно');
      assert.strictEqual(calculateTraditionalGrade(80, 'differentiated_credit'), 'добре');
      assert.strictEqual(calculateTraditionalGrade(65, 'differentiated_credit'), 'задовільно');
      assert.strictEqual(calculateTraditionalGrade(40, 'differentiated_credit'), 'незадовільно');
    });
  });
});

describe('domain type contracts compilation verification', () => {
  test('validates StudentProfile shape', () => {
    const student: StudentProfile = {
      id: 'stud-1',
      moodleId: 101,
      fullName: 'Барсуков Родіон Сергійович',
      email: 'rodion.barsukov@karazin.ua',
      studentCardNumber: 'КВ №12345678',
      recordBookNumber: 'ЗК-2023-12',
      faculty: 'ННІ комп’ютерних наук та штучного інтелекту',
      department: 'Кафедра штучного інтелекту та програмної інженерії',
      specialty: '122 Комп’ютерні науки',
      educationalProgram: 'Комп’ютерні науки та технології штучного інтелекту',
      degree: 'bachelor',
      course: 3,
      group: 'КС-31',
      studyForm: 'full-time',
      financing: 'budget',
      status: 'active',
      gpa: 94.5,
      totalCreditsEarned: 120,
      academicStanding: 'honors',
    };

    assert.strictEqual(student.group, 'КС-31');
  });

  test('validates CurriculumItem and Course shape', () => {
    const item: CurriculumItem = {
      id: 12,
      code: 'CS301',
      name: 'Об’єктно-орієнтоване програмування',
      shortName: 'ООП',
      credits: 4,
      semester: 5,
      academicYear: '2025/2026',
      controlType: 'exam',
      instructors: [{ name: 'Доц. Іваненко І.І.' }],
      status: 'in_progress',
    };

    const course: Course = item;

    assert.strictEqual(course.code, 'CS301');
  });

  test('validates StudentRecordBookItem and GradeRecord shape', () => {
    const record: StudentRecordBookItem = {
      id: 'rec-1',
      courseId: 12,
      courseName: 'Об’єктно-орієнтоване програмування',
      credits: 4,
      semester: 5,
      academicYear: '2025/2026',
      controlType: 'exam',
      currentScore: 55,
      examScore: 38,
      totalScore: 93,
      ectsGrade: 'A',
      traditionalGrade: 'відмінно',
      isPassed: true,
    };

    const gradeRecord: GradeRecord = record;

    assert.strictEqual(gradeRecord.totalScore, 93);
    assert.strictEqual(gradeRecord.ectsGrade, 'A');
  });

  test('validates AssignmentItem shape', () => {
    const assignment: AssignmentItem = {
      id: 42,
      courseId: 12,
      courseName: 'Об’єктно-орієнтоване програмування',
      name: 'Лабораторна робота №1',
      duedate: 1775000000,
      submissionStatus: 'submitted',
    };

    assert.strictEqual(assignment.id, 42);
  });

  test('validates ScheduleItem shape', () => {
    const schedule: ScheduleItem = {
      id: 'sch-1',
      title: 'ООП (Лекція)',
      type: 'lecture',
      instructor: 'Доц. Іваненко І.І.',
      location: 'Ауд. 3-12',
      startTime: '08:30',
      endTime: '10:05',
      dayOfWeek: 1,
    };

    assert.strictEqual(schedule.dayOfWeek, 1);
  });

  test('validates LmsConnectionStatus shape', () => {
    const lms: LmsConnectionStatus = {
      host: 'https://moodle.universemvp.tech',
      isConnected: true,
      status: 'online',
      lastSyncTimestamp: 1775000000,
      userTokenValid: true,
    };

    assert.strictEqual(lms.isConnected, true);
  });
});
