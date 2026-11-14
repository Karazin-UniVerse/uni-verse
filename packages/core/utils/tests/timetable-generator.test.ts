import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  MAX_PAIRS_PER_SATURDAY,
  TIMETABLE_TEACHING_TYPE,
  TIMETABLE_WEEKDAY,
} from '../../constants/timetable.ts';
import type {
  ScheduledEvent,
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
  test('prefers saved teacher slots and returns strict candidates before relaxed alternatives', () => {
    const result = generateTimetableCandidates({
      calendar,
      demands: [
        {
          id: 'preferred',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          teacherId: 'teacher',
          groupIds: ['group'],
          academicHours: 32,
        },
      ],
      preferences: [
        {
          teacherId: 'teacher',
          semesterCalendarId: 'semester',
          weekday: 5,
          pair: 2,
          preference: 'PREFERRED',
        },
      ],
    });

    assert.ok(result.ok);
    assert.equal(result.candidates[0].events[0].date, '2026-09-11');
    assert.equal(result.candidates[0].events[0].pair, 2);
  });

  test('falls back to undesirable slots when every allowed slot is undesirable', () => {
    const preferences = Array.from({ length: 5 }, (_, day) =>
      Array.from({ length: 7 }, (_, index) => ({
        teacherId: 'teacher',
        semesterCalendarId: 'semester',
        weekday: day + 1,
        pair: index + 1,
        preference: 'UNDESIRABLE' as const,
      })),
    ).flat();
    const result = generateTimetableCandidates({
      calendar,
      demands: [
        {
          id: 'fallback',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          teacherId: 'teacher',
          groupIds: ['group'],
          academicHours: 32,
        },
      ],
      preferences,
    });

    assert.ok(result.ok);
    assert.equal(result.candidates[0].preferenceViolations?.length, 16);
  });

  test('ranks strict candidates ahead of relaxed alternatives without duplicates', () => {
    const undesirable: Array<{
      teacherId: string;
      semesterCalendarId: string;
      weekday: number;
      pair: number;
      preference: 'UNDESIRABLE';
    }> = [];

    for (let weekday = 2; weekday <= 5; weekday += 1) {
      for (let pair = 1; pair <= 5; pair += 1) {
        undesirable.push({
          teacherId: 'teacher',
          semesterCalendarId: 'semester',
          weekday,
          pair,
          preference: 'UNDESIRABLE',
        });
      }
    }

    for (let pair = 2; pair <= 5; pair += 1) {
      undesirable.push({
        teacherId: 'teacher',
        semesterCalendarId: 'semester',
        weekday: 1,
        pair,
        preference: 'UNDESIRABLE',
      });
    }

    const result = generateTimetableCandidates({
      calendar: { ...calendar, teachingWeeks: 1 },
      nominalWeeks: 1,
      options: { maxCandidates: 3 },
      demands: [
        {
          id: 'single-lecture',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          teacherId: 'teacher',
          groupIds: ['group'],
          academicHours: 2,
        },
      ],
      preferences: undesirable,
    });

    assert.ok(result.ok);
    assert.equal(result.candidates.length, 3);
    assert.equal(result.candidates[0].preferenceViolations?.length, 0);
    assert.equal(result.candidates[0].events[0].date, '2026-09-07');
    assert.equal(result.candidates[0].events[0].pair, 1);
    assert.ok((result.candidates[1].preferenceViolations?.length ?? 0) > 0);
    assert.ok((result.candidates[2].preferenceViolations?.length ?? 0) > 0);

    const keys = result.candidates.map(
      (candidate) => `${candidate.events[0].date}|${candidate.events[0].pair}`,
    );

    assert.equal(new Set(keys).size, 3);
  });

  test('isolates preferences per teacher and keeps unavailability and late limits mandatory', () => {
    const result = generateTimetableCandidates({
      calendar: { ...calendar, teachingWeeks: 1 },
      nominalWeeks: 1,
      demands: [
        {
          id: 'teacher-a-lecture',
          disciplineTitle: 'Algorithms',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          teacherId: 'teacher-a',
          groupIds: ['group-1'],
          academicHours: 2,
        },
        {
          id: 'teacher-b-lecture',
          disciplineTitle: 'Physics',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          teacherId: 'teacher-b',
          groupIds: ['group-2'],
          academicHours: 2,
        },
      ],
      unavailability: [
        {
          teacherId: 'teacher-a',
          date: '2026-09-07',
          pair: 6,
          isConfirmed: true,
        },
        {
          teacherId: 'teacher-a',
          date: '2026-09-07',
          pair: 1,
          isConfirmed: true,
        },
      ],
      preferences: [
        {
          teacherId: 'teacher-a',
          semesterCalendarId: 'semester',
          weekday: 1,
          pair: 6,
          preference: 'PREFERRED',
        },
        {
          teacherId: 'teacher-a',
          semesterCalendarId: 'semester',
          weekday: 1,
          pair: 1,
          preference: 'PREFERRED',
        },
        {
          teacherId: 'teacher-a',
          semesterCalendarId: 'semester',
          weekday: 6,
          pair: 1,
          preference: 'PREFERRED',
        },
        {
          teacherId: 'teacher-a',
          semesterCalendarId: 'semester',
          weekday: 2,
          pair: 2,
          preference: 'UNDESIRABLE',
        },
      ],
    });

    assert.ok(result.ok);

    const teacherAEvent = result.candidates[0].events.find(
      (event) => event.teachingAssignmentId === 'teacher-a-lecture',
    );
    const teacherBEvent = result.candidates[0].events.find(
      (event) => event.teachingAssignmentId === 'teacher-b-lecture',
    );

    assert.ok(teacherAEvent);
    assert.ok(teacherBEvent);
    assert.notEqual(teacherAEvent.date, '2026-09-12');
    assert.ok(teacherAEvent.pair <= 5);
    assert.equal(teacherBEvent.date, '2026-09-07');
    assert.equal(teacherBEvent.pair, 1);
  });

  test('shares overall timeout across preference passes', () => {
    const result = generateTimetableCandidates({
      calendar,
      options: { timeoutMs: 0 },
      demands: [
        {
          id: 'timeout-lecture',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          teacherId: 'teacher',
          groupIds: ['group'],
          academicHours: 32,
        },
      ],
      preferences: [
        {
          teacherId: 'teacher',
          semesterCalendarId: 'semester',
          weekday: 1,
          pair: 1,
          preference: 'PREFERRED',
        },
      ],
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'TIMEOUT');
  });

  test('waits for the first lecture of every group in a joint practical', () => {
    const result = generateTimetableCandidates({
      demands: [
        {
          id: 'PRACTICE',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
          groupIds: ['A', 'B'],
          academicHours: 2,
        },
      ],
      calendar: { ...calendar, teachingWeeks: 1 },
      nominalWeeks: 1,
      fixedEvents: [
        {
          id: 'LA',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          groupIds: ['A'],
          date: '2026-09-07',
          pair: 1,
        },
        {
          id: 'LB',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          groupIds: ['B'],
          date: '2026-09-11',
          pair: 1,
        },
      ],
    });

    assert.ok(result.ok);

    for (const candidate of result.candidates) {
      assert.equal(candidate.events[0].date, '2026-09-11');
      assert.ok(candidate.events[0].pair > 1);
    }
  });

  test('prunes impossible precedence before exploring unrelated demands', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'LECTURE',
        disciplineTitle: 'Calculus',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'LECTURER',
        groupIds: ['GROUP-1'],
        academicHours: 2,
      },
      {
        id: 'PRACTICE',
        disciplineTitle: 'Calculus',
        teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
        teacherId: 'TUTOR',
        groupIds: ['GROUP-1'],
        academicHours: 2,
      },
      ...Array.from({ length: 3 }, (_, index): TeachingDemand => ({
        id: `OTHER-${index}`,
        disciplineTitle: `Other ${index}`,
        teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
        groupIds: [`OTHER-GROUP-${index}`],
        academicHours: 2,
      })),
    ];
    const unavailability: TeacherUnavailability[] = [
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
    ].flatMap((date) =>
      ['LECTURER', 'TUTOR'].flatMap((teacherId) =>
        date === (teacherId === 'LECTURER' ? '2026-09-11' : '2026-09-07')
          ? []
          : Array.from({ length: 7 }, (_, index) => ({
              teacherId,
              date,
              pair: index + 1,
              isConfirmed: true,
            })),
      ),
    );
    const result = generateTimetableCandidates({
      demands,
      calendar: { ...calendar, teachingWeeks: 1 },
      nominalWeeks: 1,
      unavailability,
    });

    assert.ok(result.diagnostics.statesExplored <= 50, JSON.stringify(result.diagnostics));
    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.error, 'NO_FEASIBLE_SOLUTION');
    }
  });

  test('keeps searching while a lecture layer can still precede a fixed practice', () => {
    const result = generateTimetableCandidates({
      demands: [
        {
          id: 'LATE',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          teacherId: 'LECTURER',
          groupIds: ['A'],
          academicHours: 2,
        },
        {
          id: 'EARLY',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          groupIds: ['A'],
          academicHours: 2,
        },
      ],
      calendar: { ...calendar, teachingWeeks: 1 },
      nominalWeeks: 1,
      fixedEvents: [
        {
          id: 'P',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
          groupIds: ['A'],
          date: '2026-09-07',
          pair: 2,
        },
      ],
      unavailability: ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'].flatMap((date) =>
        Array.from({ length: 7 }, (_, index) => ({
          teacherId: 'LECTURER',
          date,
          pair: index + 1,
          isConfirmed: true,
        })),
      ),
    });

    assert.ok(result.ok);
    assert.ok(
      result.candidates[0].events.some(
        (event) =>
          event.teachingAssignmentId === 'EARLY' && event.date === '2026-09-07' && event.pair === 1,
      ),
    );
  });

  test('one fixed lecture permits practicals in later weeks without a lecture demand', () => {
    const result = generateTimetableCandidates({
      demands: [
        {
          id: 'P',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
          groupIds: ['A', 'NO-LECTURES'],
          academicHours: 4,
        },
      ],
      calendar: { ...calendar, teachingWeeks: 2 },
      nominalWeeks: 2,
      fixedEvents: [
        {
          id: 'L',
          disciplineTitle: 'Calculus',
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          groupIds: ['A'],
          date: '2026-09-04',
          pair: 1,
        },
      ],
    });

    assert.ok(result.ok);
    assert.deepEqual(
      result.candidates[0].events.map((event) => event.date),
      ['2026-09-07', '2026-09-14'],
    );
  });

  test('rejects a seminar when its only free day precedes the first lecture', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'LECTURE',
        disciplineTitle: 'Calculus',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'LECTURER',
        groupIds: ['GROUP-1'],
        academicHours: 2,
      },
      {
        id: 'SEMINAR',
        disciplineTitle: 'Calculus',
        teachingType: TIMETABLE_TEACHING_TYPE.SEMINAR,
        teacherId: 'TUTOR',
        groupIds: ['GROUP-1'],
        academicHours: 2,
      },
    ];
    const unavailability: TeacherUnavailability[] = [
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
    ].flatMap((date) =>
      ['LECTURER', 'TUTOR'].flatMap((teacherId) =>
        date === (teacherId === 'LECTURER' ? '2026-09-11' : '2026-09-07')
          ? []
          : Array.from({ length: 7 }, (_, index) => ({
              teacherId,
              date,
              pair: index + 1,
              isConfirmed: true,
            })),
      ),
    );
    const result = generateTimetableCandidates({
      demands,
      calendar: { ...calendar, teachingWeeks: 1 },
      nominalWeeks: 1,
      unavailability,
    });

    assert.equal(result.ok, false);
  });

  test('places a practice after the lecture on the same day without weekday preferences', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'FRIDAY-LECTURE',
        disciplineTitle: 'Calculus',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'LECTURER',
        groupIds: ['GROUP-1'],
        academicHours: 2,
      },
      {
        id: 'FRIDAY-PRACTICE',
        disciplineTitle: 'Calculus',
        teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
        groupIds: ['GROUP-1'],
        academicHours: 2,
      },
    ];
    const unavailability: TeacherUnavailability[] = [
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
    ].flatMap((date) =>
      Array.from({ length: 7 }, (_, index) => ({
        teacherId: 'LECTURER',
        date,
        pair: index + 1,
        isConfirmed: true,
      })),
    );
    const result = generateTimetableCandidates({
      demands: [...demands].reverse(),
      calendar: { ...calendar, teachingWeeks: 1 },
      nominalWeeks: 1,
      unavailability,
    });

    assert.ok(result.ok);

    const lecture = result.candidates[0].events.find(
      (event) => event.teachingAssignmentId === 'FRIDAY-LECTURE',
    );
    const practice = result.candidates[0].events.find(
      (event) => event.teachingAssignmentId === 'FRIDAY-PRACTICE',
    );

    assert.ok(lecture);
    assert.ok(practice);
    assert.equal(lecture.date, '2026-09-11');
    assert.equal(practice.date, '2026-09-11');
    assert.ok(practice.pair > lecture.pair);
  });

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

  test('schedules demands without a teacher and never double books the group', () => {
    const demands: TeachingDemand[] = ['A', 'B', 'C'].map((suffix): TeachingDemand => ({
      id: `NO-TEACHER-${suffix}`,
      disciplineTitle: `Discipline ${suffix}`,
      teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
      groupIds: ['GROUP-1'],
      academicHours: 32,
    }));

    const result = generateTimetableCandidates({ demands, calendar });

    assert.ok(result.ok);

    const [candidate] = result.candidates;

    assert.strictEqual(candidate.events.length, 48);
    assert.ok(checkTimetableConflicts({ events: candidate.events }).isValid);
    assert.ok(candidate.events.every((event) => event.teacherId === undefined));
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

  test('spreads hours that fit no named pattern evenly over the semester', () => {
    const demands: TeachingDemand[] = [
      {
        id: 'ELECTIVE-30',
        disciplineTitle: 'University elective',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'TEACHER-ELECTIVE',
        groupIds: ['GROUP-ELECTIVE'],
        academicHours: 30,
      },
    ];

    const result = generateTimetableCandidates({ demands, calendar });

    assert.strictEqual(result.ok, true);

    if (result.ok) {
      const events = result.candidates[0].events;
      const weekOf = (date: string): number =>
        Math.floor((Date.parse(date) - Date.parse(calendar.startDate)) / (7 * 86_400_000));
      const perWeek = new Map<number, number>();

      for (const event of events) {
        perWeek.set(weekOf(event.date), (perWeek.get(weekOf(event.date)) ?? 0) + 1);
      }

      assert.strictEqual(events.length, 15);
      assert.ok(Math.max(...perWeek.values()) <= 1);
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

  test('rejects demand with no participants as INVALID_INPUT', () => {
    const demand: TeachingDemand = {
      id: 'DEMAND-NO-PARTICIPANTS',
      disciplineTitle: 'Discrete Math',
      teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
      teacherId: 'TEACHER-MATH',
      groupIds: [],
      academicHours: 32,
    };

    const result = generateTimetableCandidates({ demands: [demand], calendar });

    assert.strictEqual(result.ok, false);

    if (!result.ok) {
      assert.strictEqual(result.error, 'INVALID_INPUT');
    }
  });

  test('rejects demand with subgroupId but empty groupIds as INVALID_INPUT', () => {
    const demand: TeachingDemand = {
      id: 'DEMAND-SUBGROUP-NO-GROUP',
      disciplineTitle: 'Discrete Math',
      teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
      teacherId: 'TEACHER-MATH',
      groupIds: [],
      subgroupId: 'MATH-101-1',
      academicHours: 32,
    };

    const result = generateTimetableCandidates({ demands: [demand], calendar });

    assert.strictEqual(result.ok, false);

    if (!result.ok) {
      assert.strictEqual(result.error, 'INVALID_INPUT');
    }
  });

  test('rejects demand with EXAM teaching type as INVALID_INPUT', () => {
    const demand: TeachingDemand = {
      id: 'DEMAND-EXAM',
      disciplineTitle: 'Discrete Math Exam',
      teachingType: TIMETABLE_TEACHING_TYPE.EXAM,
      teacherId: 'TEACHER-MATH',
      groupIds: ['MATH-101'],
      academicHours: 32,
    };

    const result = generateTimetableCandidates({ demands: [demand], calendar });

    assert.strictEqual(result.ok, false);

    if (!result.ok) {
      assert.strictEqual(result.error, 'INVALID_INPUT');
    }
  });

  describe('fixed events', () => {
    const MONDAY_MS = Date.parse('2026-09-07T00:00:00Z');
    const WEEK_MS = 7 * 86_400_000;
    const lecture: TeachingDemand = {
      id: 'DEMAND-FIXED-LEC',
      disciplineTitle: 'Calculus',
      teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
      teacherId: 'TEACHER-1',
      groupIds: ['GROUP-1'],
      academicHours: 32,
    };
    const getMondayFirstPairs = (overrides: Partial<ScheduledEvent>): ScheduledEvent[] =>
      Array.from({ length: WEEKS }, (_, weekIndex): ScheduledEvent => ({
        id: `FIXED-${weekIndex}`,
        teachingAssignmentId: 'FIXED-ASSIGNMENT',
        disciplineTitle: 'Published elsewhere',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'TEACHER-OTHER',
        groupIds: ['GROUP-OTHER'],
        date: new Date(MONDAY_MS + weekIndex * WEEK_MS).toISOString().slice(0, 10),
        pair: 1,
        ...overrides,
      }));

    test('avoids slots occupied by fixed events of the same group', () => {
      const fixedEvents = getMondayFirstPairs({ groupIds: ['GROUP-1'] });
      const result = generateTimetableCandidates({ demands: [lecture], calendar, fixedEvents });

      assert.ok(result.ok);

      const [candidate] = result.candidates;
      const fixedKeys = new Set(fixedEvents.map(({ date, pair }): string => `${date}|${pair}`));

      assert.strictEqual(candidate.events.length, 16);
      assert.ok(
        candidate.events.every(({ date, pair }): boolean => !fixedKeys.has(`${date}|${pair}`)),
      );
      assert.ok(candidate.events.every(({ id }): boolean => !id.startsWith('FIXED-')));
      assert.ok(checkTimetableConflicts({ events: [...fixedEvents, ...candidate.events] }).isValid);
    });

    test('avoids slots occupied by fixed events of the same teacher', () => {
      const fixedEvents = getMondayFirstPairs({ teacherId: 'TEACHER-1' });
      const result = generateTimetableCandidates({ demands: [lecture], calendar, fixedEvents });

      assert.ok(result.ok);
      assert.ok(
        checkTimetableConflicts({ events: [...fixedEvents, ...result.candidates[0].events] })
          .isValid,
      );
    });

    test('ignores fixed events of unrelated teachers and groups', () => {
      const withFixed = generateTimetableCandidates({
        demands: [lecture],
        calendar,
        fixedEvents: getMondayFirstPairs({}),
      });
      const without = generateTimetableCandidates({ demands: [lecture], calendar });

      assert.ok(withFixed.ok && without.ok);
      assert.deepStrictEqual(withFixed.candidates[0].events, without.candidates[0].events);
    });
  });

  describe('shortened semester', () => {
    test('orders relaxed Saturday pairs by preferences without losing canonical combinations', () => {
      const preferences = Array.from({ length: 5 }, (_, day) =>
        Array.from({ length: 5 }, (_, pair) => ({
          teacherId: 'teacher',
          semesterCalendarId: 'semester',
          weekday: day + 1,
          pair: pair + 1,
          preference: 'UNDESIRABLE' as const,
        })),
      ).flat();

      preferences.push({
        teacherId: 'teacher',
        semesterCalendarId: 'semester',
        weekday: 6,
        pair: 1,
        preference: 'UNDESIRABLE',
      });
      const result = generateTimetableCandidates({
        calendar: { ...calendar, teachingWeeks: 14 },
        demands: [
          {
            id: 'relaxed',
            disciplineTitle: 'Calculus',
            teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
            teacherId: 'teacher',
            groupIds: ['group'],
            academicHours: 32,
          },
        ],
        preferences,
      });

      assert.ok(result.ok);
      assert.equal(result.candidates[0].automaticMakeupDates?.length, 1);
      assert.equal(result.candidates[0].preferenceViolations?.length, 14);
      assert.deepEqual(
        result.candidates[0].events
          .filter((event) => event.isMakeupSaturday)
          .map((event) => event.pair),
        [2, 3],
      );
      const preferredResult = generateTimetableCandidates({
        calendar: { ...calendar, teachingWeeks: 14 },
        demands: [
          {
            id: 'preferred-rank',
            disciplineTitle: 'Calculus',
            teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
            teacherId: 'teacher',
            groupIds: ['group'],
            academicHours: 32,
          },
        ],
        preferences: [
          ...preferences,
          {
            teacherId: 'teacher',
            semesterCalendarId: 'semester',
            weekday: 6,
            pair: 5,
            preference: 'PREFERRED',
          },
        ],
      });

      assert.ok(preferredResult.ok);
      assert.equal(preferredResult.candidates[0].preferenceViolations?.length, 14);
      assert.deepEqual(
        preferredResult.candidates[0].events
          .filter((event) => event.isMakeupSaturday)
          .map((event) => event.pair),
        [5, 2],
      );
    });
    test('sums distinct Saturday capacities instead of reusing the best date capacity', () => {
      const demands: TeachingDemand[] = Array.from({ length: 10 }, (_, index) => ({
        id: `shared-${index}`,
        disciplineTitle: `Course ${index}`,
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'shared',
        groupIds: ['group'],
        academicHours: 32,
      }));

      demands.push({
        id: 'saturday',
        disciplineTitle: 'Saturday',
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        groupIds: ['group'],
        academicHours: 24,
        isSaturdayOnly: true,
      });

      const result = generateTimetableCandidates({
        calendar: { ...calendar, teachingWeeks: 14 },
        demands,
        options: { timeoutMs: 1000 },
      });

      assert.ok(result.ok, JSON.stringify(result.diagnostics));
      assert.equal(result.candidates[0].events.length, 172);
      assert.equal(result.candidates[0].automaticMakeupDates?.length, 5);
      assert.ok(checkTimetableConflicts({ events: result.candidates[0].events }).isValid);
    });
    test('adds as many Saturdays as needed but never more than five pairs on one of them', () => {
      const demands: TeachingDemand[] = Array.from({ length: 12 }, (_, index) => ({
        id: `crowded-${index}`,
        disciplineTitle: `Course ${index}`,
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: `teacher-${index}`,
        groupIds: ['crowded-group'],
        academicHours: 32,
        hasLateSlotAuthorization: true,
      }));
      const result = generateTimetableCandidates({
        calendar: { ...calendar, teachingWeeks: 14 },
        demands,
        options: { timeoutMs: 3000 },
      });

      assert.ok(result.ok, JSON.stringify(result.diagnostics));

      const pairsPerSaturday = new Map<string, number>();

      for (const event of result.candidates[0].events) {
        if (new Date(`${event.date}T00:00:00Z`).getUTCDay() === TIMETABLE_WEEKDAY.SATURDAY) {
          pairsPerSaturday.set(event.date, (pairsPerSaturday.get(event.date) ?? 0) + 1);
        }
      }

      assert.equal(result.candidates[0].events.length, 192);
      assert.ok(pairsPerSaturday.size >= 5);
      assert.ok(Math.max(...pairsPerSaturday.values()) <= MAX_PAIRS_PER_SATURDAY);
    });
    test('keeps every lecture ahead of its practices when a short semester starts midweek', () => {
      const demands: TeachingDemand[] = Array.from({ length: 4 }, (_, index) => [
        {
          id: `midweek-lecture-${index}`,
          disciplineTitle: `Course ${index}`,
          teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
          teacherId: `lecturer-${index}`,
          groupIds: ['midweek-group'],
          academicHours: 32,
        },
        {
          id: `midweek-practice-${index}`,
          disciplineTitle: `Course ${index}`,
          teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
          teacherId: `assistant-${index}`,
          groupIds: ['midweek-group'],
          academicHours: 32,
        },
      ]).flat();
      const result = generateTimetableCandidates({
        calendar: { ...calendar, startDate: '2026-09-08', teachingWeeks: 14 },
        demands,
        options: { timeoutMs: 3000 },
      });

      assert.ok(result.ok, JSON.stringify(result.diagnostics));

      const { events } = result.candidates[0];
      const firstOf = (id: string): string =>
        events
          .filter((event) => event.teachingAssignmentId === id)
          .map((event) => `${event.date}|${event.pair}`)
          .sort()[0];

      assert.equal(events.length, 128);

      for (let index = 0; index < 4; index += 1) {
        assert.ok(firstOf(`midweek-lecture-${index}`) < firstOf(`midweek-practice-${index}`));
      }
    });
    test('rejects impossible teacher Saturday budgets before enumerating weekday combinations', () => {
      const demands: TeachingDemand[] = Array.from({ length: 8 }, (_, index) => ({
        id: `capacity-${index}`,
        disciplineTitle: `Course ${index}`,
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        teacherId: 'shared',
        groupIds: [`group-${index}`],
        academicHours: 32,
      }));
      const result = generateTimetableCandidates({
        calendar: { ...calendar, teachingWeeks: 14 },
        demands,
        options: { timeoutMs: 1000 },
      });

      assert.ok(result.ok, JSON.stringify(result.diagnostics));
      assert.equal(result.candidates[0].automaticMakeupDates?.length, 4);
      assert.equal(result.candidates[0].events.length, 128);
    });
    const demand32h: TeachingDemand = {
      id: 'DEMAND-SHORT-32H',
      disciplineTitle: 'Discrete Math',
      teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
      teacherId: 'TEACHER-MATH',
      groupIds: ['MATH-101'],
      academicHours: 32,
    };

    test('shares one automatic Saturday across different weekday origins and respects fixed occupancy', () => {
      const shortCalendar = { ...calendar, teachingWeeks: 14 };
      const demands = [demand32h, { ...demand32h, id: 'other', disciplineTitle: 'Physics' }];
      const fixedEvents: ScheduledEvent[] = [];

      for (let week = 0; week < 14; week += 1) {
        for (let weekday = 1; weekday <= 5; weekday += 1) {
          for (let pair = 1; pair <= 5; pair += 1) {
            if ((weekday === 1 || weekday === 2) && pair === 1) continue;

            fixedEvents.push({
              ...demand32h,
              id: `fixed-${week}-${weekday}-${pair}`,
              teachingAssignmentId: 'fixed',
              date: new Date(Date.parse(calendar.startDate) + (week * 7 + weekday - 1) * 86400000)
                .toISOString()
                .slice(0, 10),
              pair,
            });
          }
        }
      }

      const result = generateTimetableCandidates({ calendar: shortCalendar, demands, fixedEvents });

      assert.ok(result.ok);
      const candidate = result.candidates[0];

      assert.equal(candidate.events.length, 32);
      assert.equal(candidate.automaticMakeupDates?.length, 1);
      assert.equal(
        new Set(
          candidate.events
            .filter((event) => !event.isMakeupSaturday)
            .map((event) => new Date(event.date).getUTCDay()),
        ).size,
        2,
      );
      assert.ok(checkTimetableConflicts({ events: [...fixedEvents, ...candidate.events] }).isValid);
    });

    test('counts a midweek start from its first day and avoids excluded Saturdays', () => {
      const result = generateTimetableCandidates({
        calendar: {
          ...calendar,
          startDate: '2026-09-09',
          teachingWeeks: 14,
          excludedDates: ['2026-09-12'],
        },
        demands: [demand32h],
        preferences: [
          {
            teacherId: demand32h.teacherId!,
            semesterCalendarId: 'semester',
            weekday: 1,
            pair: 1,
            preference: 'PREFERRED',
          },
        ],
      });

      assert.ok(result.ok);
      const candidate = result.candidates[0];

      assert.equal(candidate.events.length, 16);
      assert.equal(candidate.events.filter((event) => event.isMakeupSaturday).length, 2);
      assert.equal(candidate.automaticMakeupDates?.length, 1);
      assert.ok(
        candidate.events.every(
          (event) =>
            event.date >= '2026-09-09' && event.date < '2026-12-16' && event.date !== '2026-09-12',
        ),
      );
    });

    test('proves two dates are needed when only one pair per Saturday is available', () => {
      const unavailability = Array.from({ length: 14 }, (_, week) => {
        const date = new Date(Date.parse('2026-09-12') + week * 7 * 86400000)
          .toISOString()
          .slice(0, 10);

        return Array.from({ length: 4 }, (_, pair) => ({
          teacherId: demand32h.teacherId!,
          date,
          pair: pair + 2,
          isConfirmed: true,
        }));
      }).flat();
      const result = generateTimetableCandidates({
        calendar: { ...calendar, teachingWeeks: 14 },
        demands: [demand32h],
        unavailability,
      });

      assert.ok(result.ok);
      assert.equal(result.candidates[0].automaticMakeupDates?.length, 2);
      assert.equal(result.candidates[0].events.length, 16);
    });

    test('does not count ordinary Saturday-only lessons as automatic dates', () => {
      const result = generateTimetableCandidates({
        calendar: { ...calendar, teachingWeeks: 14 },
        demands: [{ ...demand32h, isSaturdayOnly: true, academicHours: 28 }],
      });

      assert.ok(result.ok);
      assert.equal(result.candidates[0].automaticMakeupDates?.length, 0);
      assert.equal(result.candidates[0].events.length, 14);
    });

    test('uses a single manual occurrence before compensating the remaining deficit', () => {
      const result = generateTimetableCandidates({
        calendar: {
          ...calendar,
          teachingWeeks: 14,
          makeupSaturdays: [{ date: '2026-09-12', followsWeekday: 1 }],
        },
        demands: [demand32h],
        preferences: [
          {
            teacherId: demand32h.teacherId!,
            semesterCalendarId: 'semester',
            weekday: 1,
            pair: 1,
            preference: 'PREFERRED',
          },
        ],
      });

      assert.ok(result.ok);
      assert.equal(result.candidates[0].events.length, 16);
      assert.equal(result.candidates[0].events.filter((event) => event.isMakeupSaturday).length, 2);
      assert.equal(result.candidates[0].automaticMakeupDates?.length, 1);
    });

    test('reports TIMEOUT while proving the minimum rather than returning infeasibility', () => {
      const originalNow = Date.now;
      let calls = 0;

      Date.now = (): number => calls++;

      try {
        const result = generateTimetableCandidates({
          calendar: { ...calendar, teachingWeeks: 14 },
          demands: [demand32h],
          options: { timeoutMs: 50 },
        });

        assert.equal(result.ok, false);

        if (!result.ok) {
          assert.equal(result.error, 'TIMEOUT');
        }
      } finally {
        Date.now = originalNow;
      }
    });

    test('32h/14 weeks preserves 16 occurrences using one minimum additional Saturday', () => {
      const calendar14Weeks: SemesterCalendarConfig = {
        startDate: '2026-09-07',
        teachingWeeks: 14,
        excludedDates: [],
        makeupSaturdays: [],
      };

      const result = generateTimetableCandidates({
        demands: [demand32h],
        calendar: calendar14Weeks,
      });

      assert.ok(result.ok);
      const candidate = result.candidates[0];

      assert.equal(candidate.events.length, 16);
      assert.equal(new Set(candidate.events.map((event) => event.id)).size, 16);
      assert.equal(
        new Set(
          candidate.events.filter((event) => event.isMakeupSaturday).map((event) => event.date),
        ).size,
        1,
      );
      assert.ok(checkTimetableConflicts({ events: candidate.events }).isValid);
    });

    test('32h/14 weeks with 2 matching makeup Saturdays succeeds with exactly 16 events', () => {
      const calendar14WeeksWithMakeups: SemesterCalendarConfig = {
        startDate: '2026-09-07',
        teachingWeeks: 14,
        excludedDates: [],
        makeupSaturdays: [
          { date: '2026-09-12', followsWeekday: TIMETABLE_WEEKDAY.MONDAY },
          { date: '2026-09-19', followsWeekday: TIMETABLE_WEEKDAY.MONDAY },
        ],
      };

      const result = generateTimetableCandidates({
        demands: [demand32h],
        calendar: calendar14WeeksWithMakeups,
      });

      assert.ok(result.ok);
      assert.strictEqual(result.candidates.length, 1);
      assert.strictEqual(result.candidates[0].events.length, 16);

      const report = checkTimetableConflicts({ events: result.candidates[0].events });

      assert.ok(report.isValid);
    });

    test('supports native 14-week (28h) and 18-week (36h and 32h) calendars', () => {
      const result14 = generateTimetableCandidates({
        demands: [{ ...demand32h, id: 'DEMAND-14W', academicHours: 28 }],
        calendar: {
          startDate: '2026-09-07',
          teachingWeeks: 14,
          excludedDates: [],
          makeupSaturdays: [],
        },
      });

      assert.ok(result14.ok);
      assert.strictEqual(result14.candidates[0].events.length, 14);

      const result18Native = generateTimetableCandidates({
        demands: [{ ...demand32h, id: 'DEMAND-18W', academicHours: 36 }],
        calendar: {
          startDate: '2026-09-07',
          teachingWeeks: 18,
          excludedDates: [],
          makeupSaturdays: [],
        },
      });

      assert.ok(result18Native.ok);
      assert.strictEqual(result18Native.candidates[0].events.length, 18);

      const result18Nominal = generateTimetableCandidates({
        demands: [demand32h],
        calendar: {
          startDate: '2026-09-07',
          teachingWeeks: 18,
          excludedDates: [],
          makeupSaturdays: [],
        },
      });

      assert.ok(result18Nominal.ok);
      assert.strictEqual(result18Nominal.candidates[0].events.length, 16);
    });
  });
});
