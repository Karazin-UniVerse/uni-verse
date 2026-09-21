import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { BREAKPOINTS } from '../../constants/breakpoints.ts';
import { GRADES_THRESHOLD } from '../../constants/grades.ts';
import type {
  AssignmentItem,
  Course,
  CurriculumItem,
  GradeRecord,
  LmsConnectionStatus,
  ScheduleItem,
  StudentProfile,
  StudentRecordBookItem,
} from '../index.ts';

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

  test('validates BREAKPOINTS values', () => {
    assert.strictEqual(BREAKPOINTS.xs, 480);
    assert.strictEqual(BREAKPOINTS.sm, 640);
    assert.strictEqual(BREAKPOINTS.md, 768);
    assert.strictEqual(BREAKPOINTS.lg, 1024);
    assert.strictEqual(BREAKPOINTS.xl, 1280);
    assert.strictEqual(BREAKPOINTS.xxl, 1536);
  });

  test('validates Karazin GRADES_THRESHOLD values', () => {
    assert.strictEqual(GRADES_THRESHOLD.EXCELLENT, 90);
    assert.strictEqual(GRADES_THRESHOLD.GOOD, 70);
    assert.strictEqual(GRADES_THRESHOLD.SATISFACTORY, 50);
  });
});
