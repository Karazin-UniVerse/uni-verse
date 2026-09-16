import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  calculateAccumulatedGrade,
  calculateEctsGrade,
  calculateExamTargets,
  calculateTraditionalGrade,
  MAX_EXAM,
  MAX_SEMESTER_CREDIT,
  MAX_SEMESTER_EXAM,
  MIN_EXAM_ADMISSION,
  MIN_EXAM_PASS,
  MIN_PASSING_SCORE,
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

  test('validates ungraded StudentRecordBookItem shape', () => {
    const ungradedRecord: StudentRecordBookItem = {
      id: 'rec-2',
      courseId: 15,
      courseName: 'Вища математика',
      totalScore: null,
      ectsGrade: null,
      traditionalGrade: null,
      isPassed: null,
    };

    assert.strictEqual(ungradedRecord.totalScore, null);
    assert.strictEqual(ungradedRecord.ectsGrade, null);
    assert.strictEqual(ungradedRecord.traditionalGrade, null);
    assert.strictEqual(ungradedRecord.isPassed, null);
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

describe('calculateAccumulatedGrade', () => {
  describe('constants verification', () => {
    test('verifies standard university accumulation constants', () => {
      assert.strictEqual(MAX_SEMESTER_EXAM, 60);
      assert.strictEqual(MIN_EXAM_ADMISSION, 30);
      assert.strictEqual(MAX_EXAM, 40);
      assert.strictEqual(MIN_EXAM_PASS, 20);
      assert.strictEqual(MAX_SEMESTER_CREDIT, 100);
      assert.strictEqual(MIN_PASSING_SCORE, 60);
    });
  });

  describe('exam grading', () => {
    test('denies admission when semesterScore < 30', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 28,
        controlType: 'exam',
        examScore: 35,
      });

      assert.strictEqual(result.isAdmittedToExam, false);
      assert.strictEqual(result.isExamPassed, false);
      assert.strictEqual(result.isCoursePassed, false);
      assert.strictEqual(result.traditionalGrade, 'незадовільно');
      assert.strictEqual(result.totalScore, 28);
      assert.match(result.statusMessage, /Не допущено до іспиту/);
      assert.match(result.statusMessage, /бракує 2 б\./);
    });

    test('admits student when semesterScore >= 30 but exam has not been taken yet', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 45,
        controlType: 'exam',
      });

      assert.strictEqual(result.isAdmittedToExam, true);
      assert.strictEqual(result.isExamPassed, false);
      assert.strictEqual(result.isCoursePassed, false);
      assert.strictEqual(result.totalScore, 45);
      assert.match(result.statusMessage, /Допущено до іспиту/);
    });

    test('fails student if exam score < 20 even if sum is >= 60', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 55,
        controlType: 'exam',
        examScore: 18,
      });

      assert.strictEqual(result.isAdmittedToExam, true);
      assert.strictEqual(result.isExamPassed, false);
      assert.strictEqual(result.isCoursePassed, false);
      assert.strictEqual(result.totalScore, 73);
      assert.strictEqual(result.ectsGrade, 'Fx');
      assert.strictEqual(result.traditionalGrade, 'незадовільно');
      assert.match(result.statusMessage, /менше 20 б\./);
    });

    test('passes student when semester >= 30 and exam >= 20 and total >= 60', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 50,
        controlType: 'exam',
        examScore: 35,
      });

      assert.strictEqual(result.isAdmittedToExam, true);
      assert.strictEqual(result.isExamPassed, true);
      assert.strictEqual(result.isCoursePassed, true);
      assert.strictEqual(result.totalScore, 85);
      assert.strictEqual(result.ectsGrade, 'B');
      assert.strictEqual(result.traditionalGrade, 'добре');
    });

    test('assigns A when totalScore >= 90', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 58,
        controlType: 'exam',
        examScore: 38,
      });

      assert.strictEqual(result.isCoursePassed, true);
      assert.strictEqual(result.totalScore, 96);
      assert.strictEqual(result.ectsGrade, 'A');
      assert.strictEqual(result.traditionalGrade, 'відмінно');
    });

    test('handles semester score clamping (max 60, min 0)', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 75,
        controlType: 'exam',
        examScore: 30,
      });

      assert.strictEqual(result.totalScore, 90);
      assert.strictEqual(result.ectsGrade, 'A');
    });
  });

  describe('credit and differentiated credit grading', () => {
    test('passes credit course when semesterScore >= 60', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 85,
        controlType: 'credit',
      });

      assert.strictEqual(result.totalScore, 85);
      assert.strictEqual(result.isCoursePassed, true);
      assert.strictEqual(result.ectsGrade, 'B');
      assert.strictEqual(result.traditionalGrade, 'зараховано');
      assert.strictEqual(result.isAdmittedToExam, true);
    });

    test('fails credit course when semesterScore < 60', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 54,
        controlType: 'credit',
      });

      assert.strictEqual(result.totalScore, 54);
      assert.strictEqual(result.isCoursePassed, false);
      assert.strictEqual(result.ectsGrade, 'Fx');
      assert.strictEqual(result.traditionalGrade, 'не зараховано');
    });

    test('correctly evaluates differentiated credit tiers', () => {
      const excellent = calculateAccumulatedGrade({
        semesterScore: 92,
        controlType: 'differentiated_credit',
      });

      assert.strictEqual(excellent.traditionalGrade, 'відмінно');

      const good = calculateAccumulatedGrade({
        semesterScore: 78,
        controlType: 'differentiated_credit',
      });

      assert.strictEqual(good.traditionalGrade, 'добре');

      const satisfactory = calculateAccumulatedGrade({
        semesterScore: 65,
        controlType: 'differentiated_credit',
      });

      assert.strictEqual(satisfactory.traditionalGrade, 'задовільно');

      const failed = calculateAccumulatedGrade({
        semesterScore: 48,
        controlType: 'differentiated_credit',
      });

      assert.strictEqual(failed.traditionalGrade, 'незадовільно');
    });
  });
});

describe('calculateExamTargets', () => {
  test('calculates accurate required scores for high semester score (56/60)', () => {
    const targets = calculateExamTargets(56);
    const targetMap = new Map(targets.map((target) => [target.grade, target]));

    // A (90): 90 - 56 = 34
    assert.strictEqual(targetMap.get('A')?.requiredExamScore, 34);
    assert.strictEqual(targetMap.get('A')?.isAchievable, true);

    // B (82): 82 - 56 = 26
    assert.strictEqual(targetMap.get('B')?.requiredExamScore, 26);
    assert.strictEqual(targetMap.get('B')?.isAchievable, true);

    // C (74): 74 - 56 = 18 -> clamped to minimum exam passing score 20
    assert.strictEqual(targetMap.get('C')?.requiredExamScore, 20);
    assert.strictEqual(targetMap.get('C')?.isAchievable, true);

    // E (60): 60 - 56 = 4 -> clamped to 20
    assert.strictEqual(targetMap.get('E')?.requiredExamScore, 20);
    assert.strictEqual(targetMap.get('E')?.isAchievable, true);
  });

  test('marks unreachable targets for low semester score (40/60)', () => {
    const targets = calculateExamTargets(40);
    const targetMap = new Map(targets.map((target) => [target.grade, target]));

    // A (90): 90 - 40 = 50 > 40 -> unreachable
    assert.strictEqual(targetMap.get('A')?.requiredExamScore, 50);
    assert.strictEqual(targetMap.get('A')?.isAchievable, false);

    // B (82): 82 - 40 = 42 > 40 -> unreachable
    assert.strictEqual(targetMap.get('B')?.requiredExamScore, 42);
    assert.strictEqual(targetMap.get('B')?.isAchievable, false);

    // C (74): 74 - 40 = 34 <= 40 -> achievable
    assert.strictEqual(targetMap.get('C')?.requiredExamScore, 34);
    assert.strictEqual(targetMap.get('C')?.isAchievable, true);

    // E (60): 60 - 40 = 20 <= 40 -> achievable
    assert.strictEqual(targetMap.get('E')?.requiredExamScore, 20);
    assert.strictEqual(targetMap.get('E')?.isAchievable, true);
  });

  test('marks all targets unachievable when semester score is below admission threshold (< 30)', () => {
    const targets = calculateExamTargets(25);
    const targetMap = new Map(targets.map((target) => [target.grade, target]));

    // Grade E requires 60 - 25 = 35 <= 40, but student is not admitted to exam
    assert.strictEqual(targetMap.get('E')?.isAchievable, false);
    assert.strictEqual(targetMap.get('D')?.isAchievable, false);
    assert.strictEqual(targetMap.get('C')?.isAchievable, false);
    assert.strictEqual(targetMap.get('B')?.isAchievable, false);
    assert.strictEqual(targetMap.get('A')?.isAchievable, false);
  });

  test('clamps maximum semester score to 60', () => {
    const targets = calculateExamTargets(70);
    const targetA = targets.find((target) => target.grade === 'A');

    // Clamped to 60: 90 - 60 = 30
    assert.strictEqual(targetA?.requiredExamScore, 30);
    assert.strictEqual(targetA?.isAchievable, true);
  });
});
