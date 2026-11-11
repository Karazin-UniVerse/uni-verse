import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { TIMETABLE_TEACHING_TYPE, TIMETABLE_WEEKDAY } from '../../constants/timetable.ts';
import type {
  SemesterCalendarConfig,
  TeacherUnavailability,
  TeachingDemand,
} from '../../types/timetable.ts';
import { checkTimetableConflicts, generateTimetableCandidates } from '../timetable.ts';

const WEEKS = 16;

const calendar: SemesterCalendarConfig = {
  startDate: '2026-09-07',
  teachingWeeks: WEEKS,
  excludedDates: [],
  makeupSaturdays: [],
};

describe('timetable generator', () => {
  test('solves a small solvable scenario with 2 demands, 1 group, 1 teacher', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'DEMAND-1',
        disciplineTitle: 'Calculus',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'TEACHER-1',
        groupIds: ['GROUP-1'],
        academicHours: 32,
      },
      {
        id: 'DEMAND-2',
        disciplineTitle: 'Calculus',
        teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
        teacherId: 'TEACHER-1',
        groupIds: ['GROUP-1'],
        academicHours: 32,
      },
    ];

    const result = generateTimetableCandidates({ demands, calendar });

    assert.ok(result.ok);
    assert.strictEqual(result.candidates.length, 1);

    const [candidate] = result.candidates;
    const report = checkTimetableConflicts({ events: candidate.events });

    assert.ok(report.isValid);
    assert.strictEqual(report.hardConflicts.length, 0);
    assert.strictEqual(candidate.events.length, 32);
    assert.ok(result.diagnostics.statesExplored >= 1);
    assert.ok(result.diagnostics.timeMs >= 0);
  });

  test('solves demand with stream sharing a lecture across 2 groups', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'DEMAND-STREAM-LEC',
        disciplineTitle: 'Algorithms',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'PROF-1',
        groupIds: ['CS-101', 'CS-102'],
        streamId: 'STREAM-ALGO',
        academicHours: 32,
      },
      {
        id: 'DEMAND-CS101-PRAC',
        disciplineTitle: 'Algorithms',
        teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
        teacherId: 'TA-1',
        groupIds: ['CS-101'],
        academicHours: 32,
      },
      {
        id: 'DEMAND-CS102-PRAC',
        disciplineTitle: 'Algorithms',
        teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
        teacherId: 'TA-2',
        groupIds: ['CS-102'],
        academicHours: 32,
      },
    ];

    const result = generateTimetableCandidates({ demands, calendar });

    assert.ok(result.ok);
    assert.strictEqual(result.candidates.length, 1);

    const [candidate] = result.candidates;
    const report = checkTimetableConflicts({ events: candidate.events });

    assert.ok(report.isValid);
    assert.strictEqual(report.hardConflicts.length, 0);

    const lectureEvents = candidate.events.filter(
      (event): boolean => event.teachingAssignmentId === 'DEMAND-STREAM-LEC',
    );
    const prac1Events = candidate.events.filter(
      (event): boolean => event.teachingAssignmentId === 'DEMAND-CS101-PRAC',
    );
    const prac2Events = candidate.events.filter(
      (event): boolean => event.teachingAssignmentId === 'DEMAND-CS102-PRAC',
    );

    assert.strictEqual(lectureEvents.length, 16);
    assert.strictEqual(prac1Events.length, 16);
    assert.strictEqual(prac2Events.length, 16);

    for (const lecture of lectureEvents) {
      assert.deepStrictEqual(lecture.groupIds, ['CS-101', 'CS-102']);
      assert.strictEqual(lecture.streamId, 'STREAM-ALGO');

      const clashingPrac1 = prac1Events.find(
        (practical): boolean => practical.date === lecture.date && practical.pair === lecture.pair,
      );
      const clashingPrac2 = prac2Events.find(
        (practical): boolean => practical.date === lecture.date && practical.pair === lecture.pair,
      );

      assert.strictEqual(clashingPrac1, undefined);
      assert.strictEqual(clashingPrac2, undefined);
    }
  });

  test('detects impossible scenario when demands exceed available teacher slots', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'SAT-1',
        disciplineTitle: 'Robotics',
        teachingType: TIMETABLE_TEACHING_TYPE.LABORATORY,
        teacherId: 'TEACHER-SAT',
        groupIds: ['ROBOT-1'],
        academicHours: 32,
        isSaturdayOnly: true,
      },
      {
        id: 'SAT-2',
        disciplineTitle: 'Mechatronics',
        teachingType: TIMETABLE_TEACHING_TYPE.LABORATORY,
        teacherId: 'TEACHER-SAT',
        groupIds: ['ROBOT-2'],
        academicHours: 32,
        isSaturdayOnly: true,
      },
    ];

    const saturdayDates = Array.from({ length: WEEKS }, (_, index): string => {
      const date = new Date(Date.parse('2026-09-07T00:00:00Z'));
      const daysUntilSaturday = TIMETABLE_WEEKDAY.SATURDAY - 1;

      date.setUTCDate(date.getUTCDate() + index * 7 + daysUntilSaturday);

      return date.toISOString().slice(0, 10);
    });

    const unavailability: TeacherUnavailability[] = [];

    for (const date of saturdayDates) {
      for (const pair of [2, 3, 4, 5]) {
        unavailability.push({
          teacherId: 'TEACHER-SAT',
          date,
          pair,
          isConfirmed: true,
        });
      }
    }

    const result = generateTimetableCandidates({
      demands,
      calendar,
      unavailability,
    });

    assert.strictEqual(result.ok, false);

    if (!result.ok) {
      assert.strictEqual(result.error, 'NO_FEASIBLE_SOLUTION');
      assert.ok(result.diagnostics.statesExplored >= 1);
    }
  });

  test('times out when timeoutMs is 0', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'TIMEOUT-1',
        disciplineTitle: 'Physics',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'TEACHER-P',
        groupIds: ['PHYS-1'],
        academicHours: 32,
      },
      {
        id: 'TIMEOUT-2',
        disciplineTitle: 'Physics Lab',
        teachingType: TIMETABLE_TEACHING_TYPE.LABORATORY,
        teacherId: 'TEACHER-P',
        groupIds: ['PHYS-1'],
        academicHours: 32,
      },
    ];

    const result = generateTimetableCandidates({
      demands,
      calendar,
      options: { timeoutMs: 0 },
    });

    assert.strictEqual(result.ok, false);

    if (!result.ok) {
      assert.strictEqual(result.error, 'TIMEOUT');
      assert.strictEqual(typeof result.diagnostics.timeMs, 'number');
      assert.ok(result.diagnostics.statesExplored >= 0);
    }
  });

  test('handles empty demands list gracefully', () => {
    const result = generateTimetableCandidates({ demands: [], calendar });

    assert.ok(result.ok);
    assert.strictEqual(result.candidates.length, 1);
    assert.deepStrictEqual(result.candidates[0].events, []);
    assert.strictEqual(result.candidates[0].penaltyScore, 0);
  });

  test('rejects invalid academic hours', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'INVALID-1',
        disciplineTitle: 'Invalid Course',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'TEACHER-INV',
        groupIds: ['INV-1'],
        academicHours: 31,
      },
    ];

    const result = generateTimetableCandidates({ demands, calendar });

    assert.strictEqual(result.ok, false);

    if (!result.ok) {
      assert.strictEqual(result.error, 'INVALID_INPUT');
    }
  });

  test('supports maxCandidates option to return multiple valid candidates', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'MULTI-1',
        disciplineTitle: 'Philosophy',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'PHIL-1',
        groupIds: ['GROUP-PHIL'],
        academicHours: 32,
      },
    ];

    const result = generateTimetableCandidates({
      demands,
      calendar,
      options: { maxCandidates: 3 },
    });

    assert.ok(result.ok);
    assert.strictEqual(result.candidates.length, 3);

    for (const candidate of result.candidates) {
      const report = checkTimetableConflicts({ events: candidate.events });

      assert.ok(report.isValid);
    }
  });

  test('schedules 48-hour lecture demand (24 pairs) producing exactly 24 scheduled events across 2 distinct slots', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'DEMAND-48H-LEC',
        disciplineTitle: 'Advanced Databases',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'PROF-DB',
        groupIds: ['CS-201'],
        academicHours: 48,
      },
    ];

    const result = generateTimetableCandidates({ demands, calendar });

    assert.ok(result.ok);
    assert.strictEqual(result.candidates.length, 1);

    const [candidate] = result.candidates;
    const report = checkTimetableConflicts({ events: candidate.events });

    assert.ok(report.isValid);
    assert.strictEqual(report.hardConflicts.length, 0);
    assert.strictEqual(candidate.events.length, 24);

    const distinctSlots = new Set(
      candidate.events.map((event): string => {
        const weekday = new Date(`${event.date}T00:00:00Z`).getUTCDay();

        return `${weekday}|${event.pair}`;
      }),
    );

    assert.strictEqual(distinctSlots.size, 2);
  });

  test('rejects candidate when excluded holiday lacks makeup, accepts when makeup restores it', () => {
    const demand: TeachingDemand = {
      id: 'DEMAND-WORKLOAD-CHECK',
      disciplineTitle: 'Discrete Math',
      teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
      teacherId: 'TEACHER-MATH',
      groupIds: ['MATH-101'],
      academicHours: 32,
    };

    const allWeekdaysHolidayWeek = [
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
    ];

    const calendarWithoutMakeup: SemesterCalendarConfig = {
      startDate: '2026-09-07',
      teachingWeeks: 16,
      excludedDates: allWeekdaysHolidayWeek,
      makeupSaturdays: [],
    };

    const incompleteResult = generateTimetableCandidates({
      demands: [demand],
      calendar: calendarWithoutMakeup,
    });

    assert.strictEqual(incompleteResult.ok, false);

    if (!incompleteResult.ok) {
      assert.strictEqual(incompleteResult.error, 'NO_FEASIBLE_SOLUTION');
    }

    const calendarWithMakeup: SemesterCalendarConfig = {
      startDate: '2026-09-07',
      teachingWeeks: 16,
      excludedDates: allWeekdaysHolidayWeek,
      makeupSaturdays: [{ date: '2026-09-12', followsWeekday: TIMETABLE_WEEKDAY.MONDAY }],
    };

    const completeResult = generateTimetableCandidates({
      demands: [demand],
      calendar: calendarWithMakeup,
    });

    assert.ok(completeResult.ok);
    assert.strictEqual(completeResult.candidates.length, 1);
    assert.strictEqual(completeResult.candidates[0].events.length, 16);

    const report = checkTimetableConflicts({ events: completeResult.candidates[0].events });

    assert.ok(report.isValid);
  });
});
