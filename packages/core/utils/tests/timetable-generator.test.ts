import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { TIMETABLE_TEACHING_TYPE, TIMETABLE_WEEKDAY } from '../../constants/timetable.ts';
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
    const demand32h: TeachingDemand = {
      id: 'DEMAND-SHORT-32H',
      disciplineTitle: 'Discrete Math',
      teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
      teacherId: 'TEACHER-MATH',
      groupIds: ['MATH-101'],
      academicHours: 32,
    };

    test('32h/14 weeks with 0 makeup Saturdays fails and reports deficit 2', () => {
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

      assert.strictEqual(result.ok, false);

      if (!result.ok) {
        assert.strictEqual(result.error, 'NO_FEASIBLE_SOLUTION');
        assert.deepStrictEqual(result.diagnostics.deficits, [
          { demandId: 'DEMAND-SHORT-32H', required: 16, scheduled: 14 },
        ]);
      }
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
  });
});
