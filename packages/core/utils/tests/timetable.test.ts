import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  TIMETABLE_CONFLICT_CODE,
  TIMETABLE_PHASE_ORDER,
  TIMETABLE_SKIP_REASON,
  TIMETABLE_SOFT_PENALTY_CODE,
  TIMETABLE_TEACHING_TYPE,
  TIMETABLE_VALIDATION_ERROR,
  TIMETABLE_WEEK_PARITY,
  TIMETABLE_WEEKDAY,
} from '../../constants/timetable.ts';
import type { TimetableValidationError } from '../../constants/timetable.ts';
import type {
  ConflictReport,
  ExpandSlotParams,
  ExpandSlotResult,
  PairInstantsResult,
  ScheduledEvent,
  SemesterCalendarConfig,
} from '../../types/timetable.ts';
import {
  checkTimetableConflicts,
  expandSlotOccurrences,
  getExamInstants,
  getPairInstants,
  getPairsFromAcademicHours,
  getWeeklyPairCounts,
  hasStudentIntersection,
} from '../timetable.ts';

const sum = (counts: number[]): number => counts.reduce((total, count) => total + count, 0);

const toIsoRange = (result: PairInstantsResult): string[] => {
  assert.ok(result.ok);

  return [result.start.toISOString(), result.end.toISOString()];
};

describe('timetable utils', () => {
  describe('getPairsFromAcademicHours', () => {
    test('counts one pair per two academic hours', () => {
      assert.deepStrictEqual(getPairsFromAcademicHours(32), { ok: true, pairs: 16 });
      assert.deepStrictEqual(getPairsFromAcademicHours(24), { ok: true, pairs: 12 });
      assert.deepStrictEqual(getPairsFromAcademicHours(16), { ok: true, pairs: 8 });
    });

    test('rejects odd hours instead of rounding', () => {
      assert.deepStrictEqual(getPairsFromAcademicHours(31), {
        ok: false,
        error: TIMETABLE_VALIDATION_ERROR.ODD_ACADEMIC_HOURS,
      });
    });

    test('rejects zero, negative, fractional and non-finite hours', () => {
      for (const hours of [0, -2, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        assert.deepStrictEqual(getPairsFromAcademicHours(hours), {
          ok: false,
          error: TIMETABLE_VALIDATION_ERROR.INVALID_ACADEMIC_HOURS,
        });
      }
    });
  });

  describe('getWeeklyPairCounts', () => {
    test('32 hours over 16 weeks is one pair every week', () => {
      assert.deepStrictEqual(getWeeklyPairCounts({ pairs: 16, weeks: 16 }), {
        ok: true,
        counts: Array(16).fill(1),
      });
    });

    test('16 hours over 16 weeks alternates weeks, numerator by default', () => {
      const result = getWeeklyPairCounts({ pairs: 8, weeks: 16 });

      assert.ok(result.ok);
      assert.deepStrictEqual(
        result.counts,
        Array.from({ length: 16 }, (_, index) => (index % 2 === 0 ? 1 : 0)),
      );
    });

    test('16 hours over 16 weeks can use denominator weeks', () => {
      const result = getWeeklyPairCounts({
        pairs: 8,
        weeks: 16,
        parity: TIMETABLE_WEEK_PARITY.DENOMINATOR,
      });

      assert.ok(result.ok);
      assert.deepStrictEqual(
        result.counts,
        Array.from({ length: 16 }, (_, index) => (index % 2 === 1 ? 1 : 0)),
      );
    });

    test('24 hours over 16 weeks is eight weekly weeks then eight alternating weeks', () => {
      const result = getWeeklyPairCounts({ pairs: 12, weeks: 16 });

      assert.ok(result.ok);
      assert.deepStrictEqual(result.counts.slice(0, 8), Array(8).fill(1));
      assert.deepStrictEqual(result.counts.slice(8), [1, 0, 1, 0, 1, 0, 1, 0]);
      assert.strictEqual(sum(result.counts), 12);
    });

    test('24 hours over 16 weeks supports alternating weeks first', () => {
      const result = getWeeklyPairCounts({
        pairs: 12,
        weeks: 16,
        order: TIMETABLE_PHASE_ORDER.ALTERNATING_FIRST,
      });

      assert.ok(result.ok);
      assert.deepStrictEqual(result.counts.slice(0, 8), [1, 0, 1, 0, 1, 0, 1, 0]);
      assert.deepStrictEqual(result.counts.slice(8), Array(8).fill(1));
      assert.strictEqual(sum(result.counts), 12);
    });

    test('48 hours over 16 weeks is one weekly pair plus an extra pair every other week', () => {
      const result = getWeeklyPairCounts({ pairs: 24, weeks: 16 });

      assert.ok(result.ok);
      assert.deepStrictEqual(
        result.counts,
        Array.from({ length: 16 }, (_, index) => (index % 2 === 0 ? 2 : 1)),
      );
      assert.strictEqual(sum(result.counts), 24);
    });

    test('36 hours over 16 weeks is one weekly pair plus extra pairs in weeks 1 and 9', () => {
      const result = getWeeklyPairCounts({ pairs: 18, weeks: 16 });

      assert.ok(result.ok);
      assert.deepStrictEqual(
        result.counts,
        Array.from({ length: 16 }, (_, index) => (index === 0 || index === 8 ? 2 : 1)),
      );
      assert.strictEqual(sum(result.counts), 18);
    });

    test('reports an unsupported pattern instead of inventing weeks', () => {
      // 19 pairs over 16 weeks matches no approved pattern.
      assert.deepStrictEqual(getWeeklyPairCounts({ pairs: 19, weeks: 16 }), {
        ok: false,
        error: TIMETABLE_VALIDATION_ERROR.UNSUPPORTED_PATTERN,
      });
      // 16 pairs over 14 weeks cannot be placed without extra dates.
      assert.deepStrictEqual(getWeeklyPairCounts({ pairs: 16, weeks: 14 }), {
        ok: false,
        error: TIMETABLE_VALIDATION_ERROR.UNSUPPORTED_PATTERN,
      });
    });

    test('rejects invalid pair and week counts', () => {
      for (const input of [
        { pairs: 0, weeks: 16 },
        { pairs: 8, weeks: 0 },
        { pairs: 1.5, weeks: 16 },
        { pairs: 8, weeks: -1 },
      ]) {
        assert.deepStrictEqual(getWeeklyPairCounts(input), {
          ok: false,
          error: TIMETABLE_VALIDATION_ERROR.INVALID_PAIR_OR_WEEK_COUNT,
        });
      }
    });

    test('an odd week count gives the numerator one more lesson than the denominator', () => {
      const result = getWeeklyPairCounts({ pairs: 8, weeks: 15 });

      assert.ok(result.ok);
      assert.strictEqual(sum(result.counts), 8);
      assert.deepStrictEqual(
        result.counts,
        Array.from({ length: 15 }, (_, index) => (index % 2 === 0 ? 1 : 0)),
      );
      assert.deepStrictEqual(getWeeklyPairCounts({ pairs: 5, weeks: 15 }), {
        ok: false,
        error: TIMETABLE_VALIDATION_ERROR.UNSUPPORTED_PATTERN,
      });
    });
  });

  describe('getPairInstants', () => {
    test('resolves the bell schedule in Europe/Kyiv winter time (UTC+2)', () => {
      assert.deepStrictEqual(toIsoRange(getPairInstants('2025-01-15', 1)), [
        '2025-01-15T06:30:00.000Z',
        '2025-01-15T07:50:00.000Z',
      ]);
      assert.deepStrictEqual(toIsoRange(getPairInstants('2025-01-15', 7)), [
        '2025-01-15T16:40:00.000Z',
        '2025-01-15T18:00:00.000Z',
      ]);
    });

    test('follows the spring DST change on 2025-03-30', () => {
      assert.deepStrictEqual(toIsoRange(getPairInstants('2025-03-29', 1)), [
        '2025-03-29T06:30:00.000Z',
        '2025-03-29T07:50:00.000Z',
      ]);
      assert.deepStrictEqual(toIsoRange(getPairInstants('2025-03-30', 1)), [
        '2025-03-30T05:30:00.000Z',
        '2025-03-30T06:50:00.000Z',
      ]);
      assert.deepStrictEqual(toIsoRange(getPairInstants('2025-03-31', 1)), [
        '2025-03-31T05:30:00.000Z',
        '2025-03-31T06:50:00.000Z',
      ]);
    });

    test('follows the autumn DST change on 2025-10-26', () => {
      assert.deepStrictEqual(toIsoRange(getPairInstants('2025-10-25', 7)), [
        '2025-10-25T15:40:00.000Z',
        '2025-10-25T17:00:00.000Z',
      ]);
      assert.deepStrictEqual(toIsoRange(getPairInstants('2025-10-26', 1)), [
        '2025-10-26T06:30:00.000Z',
        '2025-10-26T07:50:00.000Z',
      ]);
      assert.deepStrictEqual(toIsoRange(getPairInstants('2025-10-27', 7)), [
        '2025-10-27T16:40:00.000Z',
        '2025-10-27T18:00:00.000Z',
      ]);
    });

    test('follows the 2026 DST changes (03-29 spring, 10-25 autumn)', () => {
      assert.deepStrictEqual(toIsoRange(getPairInstants('2026-03-28', 1)), [
        '2026-03-28T06:30:00.000Z',
        '2026-03-28T07:50:00.000Z',
      ]);
      assert.deepStrictEqual(toIsoRange(getPairInstants('2026-03-29', 1)), [
        '2026-03-29T05:30:00.000Z',
        '2026-03-29T06:50:00.000Z',
      ]);
      assert.deepStrictEqual(toIsoRange(getPairInstants('2026-10-24', 7)), [
        '2026-10-24T15:40:00.000Z',
        '2026-10-24T17:00:00.000Z',
      ]);
      assert.deepStrictEqual(toIsoRange(getPairInstants('2026-10-25', 1)), [
        '2026-10-25T06:30:00.000Z',
        '2026-10-25T07:50:00.000Z',
      ]);
    });

    test('every pair lasts 80 clock minutes', () => {
      for (const pair of [1, 2, 3, 4, 5, 6, 7]) {
        const result = getPairInstants('2025-10-27', pair);

        assert.ok(result.ok);
        assert.strictEqual(result.end.getTime() - result.start.getTime(), 80 * 60 * 1000);
      }
    });

    test('rejects pair numbers outside 1..7', () => {
      for (const pair of [0, 8, -1, 1.5, Number.NaN]) {
        assert.deepStrictEqual(getPairInstants('2025-01-15', pair), {
          ok: false,
          error: TIMETABLE_VALIDATION_ERROR.INVALID_PAIR_NUMBER,
        });
      }
    });

    test('rejects malformed and non-existent dates', () => {
      for (const date of [
        '2026-02-30',
        '2026-13-01',
        '2026-2-03',
        '03.02.2026',
        '2026-02-03T00:00:00Z',
        '',
      ]) {
        assert.deepStrictEqual(getPairInstants(date, 1), {
          ok: false,
          error: TIMETABLE_VALIDATION_ERROR.INVALID_DATE,
        });
      }
    });
  });

  describe('getExamInstants', () => {
    test('an exam on pairs 1 and 2 is one event from 08:30 to 11:30', () => {
      assert.deepStrictEqual(toIsoRange(getExamInstants('2025-01-15', 1)), [
        '2025-01-15T06:30:00.000Z',
        '2025-01-15T09:30:00.000Z',
      ]);
    });

    test('the last allowed start is pair 6, ending at 20:00', () => {
      assert.deepStrictEqual(toIsoRange(getExamInstants('2025-06-16', 6)), [
        '2025-06-16T14:00:00.000Z',
        '2025-06-16T17:00:00.000Z',
      ]);
    });

    test('rejects a start pair without a following pair and invalid pairs', () => {
      for (const startPair of [7, 0, 8, 1.5, Number.NaN]) {
        assert.deepStrictEqual(getExamInstants('2025-01-15', startPair), {
          ok: false,
          error: TIMETABLE_VALIDATION_ERROR.INVALID_EXAM_START_PAIR,
        });
      }
    });

    test('rejects an invalid date', () => {
      assert.deepStrictEqual(getExamInstants('2026-02-30', 1), {
        ok: false,
        error: TIMETABLE_VALIDATION_ERROR.INVALID_DATE,
      });
    });
  });

  describe('expandSlotOccurrences', () => {
    const WEEKS = 16;
    const weeklyCounts = Array<number>(WEEKS).fill(1);
    const calendar: SemesterCalendarConfig = {
      startDate: '2026-09-07',
      teachingWeeks: WEEKS,
      excludedDates: [],
      makeupSaturdays: [],
    };
    const expand = (overrides: Partial<ExpandSlotParams> = {}): ExpandSlotResult =>
      expandSlotOccurrences({
        weekday: TIMETABLE_WEEKDAY.WEDNESDAY,
        pair: 2,
        weeklyCounts,
        calendar,
        ...overrides,
      });
    const expectError = (result: ExpandSlotResult, error: TimetableValidationError): void => {
      assert.deepStrictEqual(result, { ok: false, error });
    };

    test('a weekly Wednesday slot yields one occurrence per week', () => {
      const result = expand();

      assert.ok(result.ok);
      assert.strictEqual(result.occurrences.length, WEEKS);
      assert.deepStrictEqual(result.occurrences[0], { date: '2026-09-09', weekIndex: 0, pair: 2 });
      assert.strictEqual(result.occurrences[15].date, '2026-12-23');
      assert.deepStrictEqual(result.skipped, []);
    });

    test('dates in week 1 before startDate are skipped as BEFORE_SEMESTER_START', () => {
      const result = expand({ calendar: { ...calendar, startDate: '2026-09-10' } });

      assert.ok(result.ok);
      assert.strictEqual(result.occurrences.length, WEEKS - 1);
      assert.strictEqual(result.occurrences[0].date, '2026-09-16');
      assert.deepStrictEqual(result.skipped, [
        {
          date: '2026-09-09',
          weekIndex: 0,
          pair: 2,
          reason: TIMETABLE_SKIP_REASON.BEFORE_SEMESTER_START,
        },
      ]);
    });

    test('an excluded holiday is skipped and reported', () => {
      const result = expand({ calendar: { ...calendar, excludedDates: ['2026-10-14'] } });

      assert.ok(result.ok);
      assert.strictEqual(result.occurrences.length, WEEKS - 1);
      assert.deepStrictEqual(result.skipped, [
        { date: '2026-10-14', weekIndex: 5, pair: 2, reason: 'EXCLUDED_DATE' },
      ]);
    });

    test('a makeup Saturday is an additional occurrence, not a replacement', () => {
      const result = expand({
        weekday: TIMETABLE_WEEKDAY.MONDAY,
        calendar: {
          ...calendar,
          makeupSaturdays: [{ date: '2026-09-19', followsWeekday: TIMETABLE_WEEKDAY.MONDAY }],
        },
      });

      assert.ok(result.ok);
      assert.strictEqual(result.occurrences.length, WEEKS + 1);
      assert.deepStrictEqual(
        result.occurrences.slice(1, 3).map(({ date }) => date),
        ['2026-09-14', '2026-09-19'],
      );
      assert.deepStrictEqual(result.occurrences[2], {
        date: '2026-09-19',
        weekIndex: 1,
        pair: 2,
        isMakeup: true,
        originalWeekday: TIMETABLE_WEEKDAY.MONDAY,
      });
      assert.deepStrictEqual(result.skipped, []);
    });

    test('a makeup Saturday compensates a cancelled holiday Monday', () => {
      const result = expand({
        weekday: TIMETABLE_WEEKDAY.MONDAY,
        calendar: {
          ...calendar,
          excludedDates: ['2026-09-14'],
          makeupSaturdays: [{ date: '2026-10-03', followsWeekday: TIMETABLE_WEEKDAY.MONDAY }],
        },
      });

      assert.ok(result.ok);
      assert.strictEqual(result.occurrences.length, WEEKS);
      assert.deepStrictEqual(result.skipped, [
        {
          date: '2026-09-14',
          weekIndex: 1,
          pair: 2,
          reason: TIMETABLE_SKIP_REASON.EXCLUDED_DATE,
        },
      ]);
      assert.strictEqual(result.occurrences.filter(({ isMakeup }) => isMakeup).length, 1);
    });

    test('makeup Saturdays make up weeks lost to a shortened 14-week semester', () => {
      const result = expand({
        weekday: TIMETABLE_WEEKDAY.MONDAY,
        weeklyCounts: Array.from({ length: 14 }, () => 1),
        calendar: {
          ...calendar,
          teachingWeeks: 14,
          makeupSaturdays: [
            { date: '2026-10-03', followsWeekday: TIMETABLE_WEEKDAY.MONDAY },
            { date: '2026-10-10', followsWeekday: TIMETABLE_WEEKDAY.MONDAY },
          ],
        },
      });

      assert.ok(result.ok);
      assert.strictEqual(result.occurrences.length, WEEKS);
    });

    test('reports every skip reason', () => {
      const result = expand({
        weekday: TIMETABLE_WEEKDAY.MONDAY,
        calendar: {
          ...calendar,
          startDate: '2026-09-10',
          excludedDates: ['2026-09-14', '2026-10-03'],
          makeupSaturdays: [{ date: '2026-10-03', followsWeekday: TIMETABLE_WEEKDAY.MONDAY }],
        },
      });

      assert.ok(result.ok);
      assert.deepStrictEqual(
        result.skipped.map(({ date, reason }) => [date, reason]),
        [
          ['2026-09-07', TIMETABLE_SKIP_REASON.BEFORE_SEMESTER_START],
          ['2026-09-14', TIMETABLE_SKIP_REASON.EXCLUDED_DATE],
          ['2026-10-03', TIMETABLE_SKIP_REASON.EXCLUDED_DATE],
        ],
      );
    });

    test('a makeup Saturday for another weekday does not affect this slot', () => {
      const result = expand({
        calendar: {
          ...calendar,
          makeupSaturdays: [{ date: '2026-09-19', followsWeekday: TIMETABLE_WEEKDAY.MONDAY }],
        },
      });

      assert.ok(result.ok);
      assert.strictEqual(result.occurrences.length, WEEKS);
      assert.ok(result.occurrences.every(({ isMakeup }) => isMakeup === undefined));
    });

    test('an excluded makeup Saturday is reported as skipped', () => {
      const result = expand({
        weekday: TIMETABLE_WEEKDAY.MONDAY,
        calendar: {
          ...calendar,
          excludedDates: ['2026-09-19'],
          makeupSaturdays: [{ date: '2026-09-19', followsWeekday: TIMETABLE_WEEKDAY.MONDAY }],
        },
      });

      assert.ok(result.ok);
      assert.strictEqual(result.occurrences.length, WEEKS);
      assert.deepStrictEqual(
        result.skipped.map(({ date, reason }) => [date, reason]),
        [['2026-09-19', TIMETABLE_SKIP_REASON.EXCLUDED_DATE]],
      );
    });

    test('a Saturday-only discipline occurs on Saturdays only', () => {
      const result = expand({ weekday: TIMETABLE_WEEKDAY.SATURDAY, isSaturdayOnly: true });

      assert.ok(result.ok);
      assert.strictEqual(result.occurrences.length, WEEKS);
      assert.strictEqual(result.occurrences[0].date, '2026-09-12');
      assert.ok(result.occurrences.every(({ date }) => new Date(date).getUTCDay() === 6));
    });

    test('rejects a weekday slot flagged Saturday-only and a Saturday slot not flagged', () => {
      expectError(
        expand({ weekday: TIMETABLE_WEEKDAY.MONDAY, isSaturdayOnly: true }),
        TIMETABLE_VALIDATION_ERROR.SATURDAY_DISCIPLINE_MISMATCH,
      );
      expectError(
        expand({ weekday: TIMETABLE_WEEKDAY.SATURDAY }),
        TIMETABLE_VALIDATION_ERROR.SATURDAY_DISCIPLINE_MISMATCH,
      );
    });

    test('an alternating slot occurs only in parity weeks', () => {
      const counts = getWeeklyPairCounts({ pairs: 8, weeks: WEEKS });

      assert.ok(counts.ok);

      const result = expand({ weeklyCounts: counts.counts });

      assert.ok(result.ok);
      assert.deepStrictEqual(
        result.occurrences.map(({ weekIndex }) => weekIndex),
        [0, 2, 4, 6, 8, 10, 12, 14],
      );
      assert.deepStrictEqual(result.skipped, []);
    });

    test('rejects an invalid weekday', () => {
      for (const weekday of [0, 7, 1.5, Number.NaN]) {
        expectError(expand({ weekday }), TIMETABLE_VALIDATION_ERROR.INVALID_WEEKDAY);
      }
    });

    test('rejects an invalid pair number', () => {
      expectError(expand({ pair: 8 }), TIMETABLE_VALIDATION_ERROR.INVALID_PAIR_NUMBER);
    });

    test('rejects invalid dates in the calendar', () => {
      expectError(
        expand({ calendar: { ...calendar, startDate: '2026-02-30' } }),
        TIMETABLE_VALIDATION_ERROR.INVALID_DATE,
      );
      expectError(
        expand({ calendar: { ...calendar, excludedDates: ['not-a-date'] } }),
        TIMETABLE_VALIDATION_ERROR.INVALID_DATE,
      );
    });

    test('rejects malformed semester config', () => {
      expectError(
        expand({ weeklyCounts: [1, 1] }),
        TIMETABLE_VALIDATION_ERROR.INVALID_SEMESTER_CONFIG,
      );
      expectError(
        expand({ calendar: { ...calendar, teachingWeeks: 0 }, weeklyCounts: [] }),
        TIMETABLE_VALIDATION_ERROR.INVALID_SEMESTER_CONFIG,
      );
      expectError(
        expand({ weeklyCounts: Array<number>(WEEKS).fill(-1) }),
        TIMETABLE_VALIDATION_ERROR.INVALID_SEMESTER_CONFIG,
      );
    });

    test('rejects malformed makeup Saturdays', () => {
      const makeup = (date: string, followsWeekday: number): SemesterCalendarConfig => ({
        ...calendar,
        makeupSaturdays: [{ date, followsWeekday }],
      });

      expectError(
        expand({ calendar: makeup('2026-09-18', 1) }),
        TIMETABLE_VALIDATION_ERROR.INVALID_MAKEUP_SATURDAY,
      );
      expectError(
        expand({ calendar: makeup('2027-09-18', 1) }),
        TIMETABLE_VALIDATION_ERROR.INVALID_MAKEUP_SATURDAY,
      );
    });

    test('rejects followsWeekday outside Monday..Friday', () => {
      for (const followsWeekday of [0, 6, 7, 1.5, Number.NaN]) {
        expectError(
          expand({
            calendar: { ...calendar, makeupSaturdays: [{ date: '2026-09-19', followsWeekday }] },
          }),
          TIMETABLE_VALIDATION_ERROR.INVALID_MAKEUP_SATURDAY,
        );
      }
    });

    test('rejects duplicate makeup Saturday dates', () => {
      expectError(
        expand({
          calendar: {
            ...calendar,
            makeupSaturdays: [
              { date: '2026-09-19', followsWeekday: TIMETABLE_WEEKDAY.MONDAY },
              { date: '2026-09-19', followsWeekday: TIMETABLE_WEEKDAY.TUESDAY },
            ],
          },
        }),
        TIMETABLE_VALIDATION_ERROR.INVALID_MAKEUP_SATURDAY,
      );
    });
  });
});

const makeEvent = (overrides: Partial<ScheduledEvent> & { id: string }): ScheduledEvent => ({
  teachingAssignmentId: `assignment-${overrides.id}`,
  disciplineTitle: 'Algebra',
  teachingType: TIMETABLE_TEACHING_TYPE.PRACTICAL,
  teacherId: `teacher-${overrides.id}`,
  groupIds: ['KS11'],
  date: '2026-09-07',
  pair: 2,
  ...overrides,
});

const hardCodes = (report: ConflictReport): string[] =>
  report.hardConflicts.map(({ code }) => code);

const softCodes = (report: ConflictReport): string[] =>
  report.softPenalties.map(({ code }) => code);

describe('checkTimetableConflicts', () => {
  test('accepts an empty and a clean timetable', () => {
    assert.deepStrictEqual(checkTimetableConflicts({ events: [] }), {
      isValid: true,
      hardConflicts: [],
      softPenalties: [],
      totalPenaltyScore: 0,
    });
    assert.ok(
      checkTimetableConflicts({
        events: [makeEvent({ id: 'a' }), makeEvent({ id: 'b', groupIds: ['KS12'] })],
      }).isValid,
    );
  });

  test('reports a teacher double booking', () => {
    const report = checkTimetableConflicts({
      events: [
        makeEvent({ id: 'a', teacherId: 't1', groupIds: ['KS11'] }),
        makeEvent({ id: 'b', teacherId: 't1', groupIds: ['KS12'] }),
        makeEvent({ id: 'c', teacherId: 't1', groupIds: ['KS13'], pair: 3 }),
      ],
    });

    assert.deepStrictEqual(hardCodes(report), [TIMETABLE_CONFLICT_CODE.TEACHER_OVERLAP]);
    assert.deepStrictEqual(report.hardConflicts[0].eventIds, ['a', 'b']);
    assert.equal(report.isValid, false);
  });

  test('events without a teacher never clash on the teacher, but still clash on students', () => {
    const unassigned = (id: string, groupIds: string[]): ScheduledEvent => ({
      ...makeEvent({ id, groupIds }),
      teacherId: undefined,
    });

    assert.deepStrictEqual(
      hardCodes(
        checkTimetableConflicts({
          events: [unassigned('a', ['KS11']), unassigned('b', ['KS12'])],
        }),
      ),
      [],
    );
    assert.deepStrictEqual(
      hardCodes(
        checkTimetableConflicts({
          events: [unassigned('a', ['KS11']), unassigned('b', ['KS11'])],
        }),
      ),
      [TIMETABLE_CONFLICT_CODE.STUDENT_OVERLAP],
    );
  });

  describe('student overlap', () => {
    const overlapCodes = (
      first: Partial<ScheduledEvent>,
      second: Partial<ScheduledEvent>,
    ): string[] =>
      hardCodes(
        checkTimetableConflicts({
          events: [makeEvent({ id: 'a', ...first }), makeEvent({ id: 'b', ...second })],
        }),
      );

    test('same group conflicts', () => {
      assert.deepStrictEqual(overlapCodes({}, {}), [TIMETABLE_CONFLICT_CODE.STUDENT_OVERLAP]);
    });

    test('whole group conflicts with its subgroup', () => {
      assert.deepStrictEqual(overlapCodes({ subgroupId: 'KS11-1' }, {}), [
        TIMETABLE_CONFLICT_CODE.STUDENT_OVERLAP,
      ]);
    });

    test('same subgroup conflicts', () => {
      assert.deepStrictEqual(overlapCodes({ subgroupId: 'KS11-1' }, { subgroupId: 'KS11-1' }), [
        TIMETABLE_CONFLICT_CODE.STUDENT_OVERLAP,
      ]);
    });

    test('same subgroup without groupIds detects overlap', () => {
      const report = checkTimetableConflicts({
        events: [
          makeEvent({ id: 'a', groupIds: [], subgroupId: 'KS11-1' }),
          makeEvent({ id: 'b', groupIds: [], subgroupId: 'KS11-1' }),
        ],
      });

      assert.ok(hardCodes(report).includes(TIMETABLE_CONFLICT_CODE.STUDENT_OVERLAP));
    });

    test('hasStudentIntersection handles subgroups correctly', () => {
      // (a) two events with the same defined subgroupId ALWAYS intersect
      assert.strictEqual(
        hasStudentIntersection(
          { groupIds: [], subgroupId: 'KS11-1' },
          { groupIds: [], subgroupId: 'KS11-1' },
        ),
        true,
      );

      // (b) different subgroups of the SAME group still do not intersect
      assert.strictEqual(
        hasStudentIntersection(
          { groupIds: ['KS11'], subgroupId: 'KS11-1' },
          { groupIds: ['KS11'], subgroupId: 'KS11-2' },
        ),
        false,
      );

      // whole group vs its subgroup still intersects
      assert.strictEqual(
        hasStudentIntersection(
          { groupIds: ['KS11'] },
          { groupIds: ['KS11'], subgroupId: 'KS11-1' },
        ),
        true,
      );
    });

    test('different subgroups of one group are allowed', () => {
      assert.deepStrictEqual(overlapCodes({ subgroupId: 'KS11-1' }, { subgroupId: 'KS11-2' }), []);
    });

    test('stream conflicts with each of its groups and their subgroups', () => {
      const stream = { groupIds: ['KS11', 'KS12'], streamId: 'Stream1' };

      assert.deepStrictEqual(overlapCodes(stream, { groupIds: ['KS12'] }), [
        TIMETABLE_CONFLICT_CODE.STUDENT_OVERLAP,
      ]);
      assert.deepStrictEqual(overlapCodes(stream, { groupIds: ['KS11'], subgroupId: 'KS11-2' }), [
        TIMETABLE_CONFLICT_CODE.STUDENT_OVERLAP,
      ]);
      assert.deepStrictEqual(overlapCodes(stream, { groupIds: ['KS13'] }), []);
    });

    test('explicit student sets decide the intersection', () => {
      assert.deepStrictEqual(overlapCodes({ studentIds: ['s1'] }, { studentIds: ['s2'] }), []);
      assert.deepStrictEqual(overlapCodes({ studentIds: ['s1'] }, { studentIds: ['s1', 's2'] }), [
        TIMETABLE_CONFLICT_CODE.STUDENT_OVERLAP,
      ]);
    });

    test('partially overlapping pair ranges conflict, other dates do not', () => {
      const exam = { teachingType: TIMETABLE_TEACHING_TYPE.EXAM, pair: 2 };

      assert.deepStrictEqual(overlapCodes(exam, { pair: 3 }), [
        TIMETABLE_CONFLICT_CODE.EXAM_STUDENT_OVERLAP,
      ]);
      assert.deepStrictEqual(overlapCodes(exam, { pair: 4 }), []);
      assert.deepStrictEqual(overlapCodes({}, { date: '2026-09-08' }), []);
    });
  });

  test('exam teacher overlap uses the exam code', () => {
    const report = checkTimetableConflicts({
      events: [
        makeEvent({ id: 'a', teachingType: TIMETABLE_TEACHING_TYPE.EXAM, teacherId: 't1' }),
        makeEvent({ id: 'b', teacherId: 't1', groupIds: ['KS12'], pair: 3 }),
      ],
    });

    assert.deepStrictEqual(hardCodes(report), [TIMETABLE_CONFLICT_CODE.EXAM_TEACHER_OVERLAP]);
  });

  test('only confirmed unavailability is a hard conflict', () => {
    const events = [makeEvent({ id: 'a', teacherId: 't1' })];
    const entry = { teacherId: 't1', date: '2026-09-07', pair: 2 };

    assert.deepStrictEqual(
      hardCodes(
        checkTimetableConflicts({ events, unavailability: [{ ...entry, isConfirmed: true }] }),
      ),
      [TIMETABLE_CONFLICT_CODE.CONFIRMED_UNAVAILABILITY],
    );
    assert.ok(
      checkTimetableConflicts({ events, unavailability: [{ ...entry, isConfirmed: false }] })
        .isValid,
    );
    assert.ok(
      checkTimetableConflicts({
        events,
        unavailability: [{ ...entry, pair: 3, isConfirmed: true }],
      }).isValid,
    );
  });

  test('pairs 6 and 7 need dean authorization', () => {
    for (const pair of [6, 7]) {
      assert.deepStrictEqual(
        hardCodes(checkTimetableConflicts({ events: [makeEvent({ id: 'a', pair })] })),
        [TIMETABLE_CONFLICT_CODE.UNAUTHORIZED_LATE_SLOT],
      );
      assert.ok(
        checkTimetableConflicts({
          events: [makeEvent({ id: 'a', pair, hasLateSlotAuthorization: true })],
        }).isValid,
      );
    }
  });

  describe('Saturday restriction', () => {
    const saturday = '2026-09-12';

    test('Saturday-only class is valid on Saturday and invalid on a weekday', () => {
      assert.ok(
        checkTimetableConflicts({
          events: [makeEvent({ id: 'a', date: saturday, isSaturdayOnly: true })],
        }).isValid,
      );
      assert.deepStrictEqual(
        hardCodes(
          checkTimetableConflicts({ events: [makeEvent({ id: 'a', isSaturdayOnly: true })] }),
        ),
        [TIMETABLE_CONFLICT_CODE.SATURDAY_RESTRICTION_VIOLATION],
      );
    });

    test('weekday class on Saturday needs an explicit makeup Saturday', () => {
      assert.deepStrictEqual(
        hardCodes(checkTimetableConflicts({ events: [makeEvent({ id: 'a', date: saturday })] })),
        [TIMETABLE_CONFLICT_CODE.SATURDAY_RESTRICTION_VIOLATION],
      );
      assert.ok(
        checkTimetableConflicts({
          events: [makeEvent({ id: 'a', date: saturday, isMakeupSaturday: true })],
        }).isValid,
      );
    });

    test('exam on Saturday is a hard violation (SATURDAY_RESTRICTION_VIOLATION)', () => {
      assert.deepStrictEqual(
        hardCodes(
          checkTimetableConflicts({
            events: [
              makeEvent({
                id: 'exam-sat',
                date: saturday,
                teachingType: TIMETABLE_TEACHING_TYPE.EXAM,
                pair: 1,
              }),
            ],
          }),
        ),
        [TIMETABLE_CONFLICT_CODE.SATURDAY_RESTRICTION_VIOLATION],
      );
    });
  });

  describe('exams', () => {
    const exam = (
      id: string,
      date: string,
      overrides: Partial<ScheduledEvent> = {},
    ): ScheduledEvent =>
      makeEvent({ id, date, teachingType: TIMETABLE_TEACHING_TYPE.EXAM, ...overrides });

    test('Monday and Tuesday exams of one group violate the interval', () => {
      const report = checkTimetableConflicts({
        events: [exam('a', '2026-09-07'), exam('b', '2026-09-08')],
      });

      assert.deepStrictEqual(hardCodes(report), [TIMETABLE_CONFLICT_CODE.EXAM_INTERVAL_VIOLATION]);
    });

    test('Monday and Wednesday exams are valid', () => {
      assert.ok(
        checkTimetableConflicts({ events: [exam('a', '2026-09-07'), exam('b', '2026-09-09')] })
          .isValid,
      );
    });

    test('exams of different groups are independent', () => {
      assert.ok(
        checkTimetableConflicts({
          events: [exam('a', '2026-09-07'), exam('b', '2026-09-08', { groupIds: ['KS12'] })],
        }).isValid,
      );
    });

    test('exam interval is checked per stream group', () => {
      const report = checkTimetableConflicts({
        events: [
          exam('a', '2026-09-07', { groupIds: ['KS11', 'KS12'], streamId: 'Stream1' }),
          exam('b', '2026-09-08', { groupIds: ['KS12'] }),
        ],
      });

      assert.deepStrictEqual(hardCodes(report), [TIMETABLE_CONFLICT_CODE.EXAM_INTERVAL_VIOLATION]);
    });

    test('exam must span two pairs and fit the day', () => {
      assert.deepStrictEqual(
        hardCodes(checkTimetableConflicts({ events: [exam('a', '2026-09-07', { pairSpan: 1 })] })),
        [TIMETABLE_CONFLICT_CODE.INVALID_EVENT_SLOT],
      );
      assert.deepStrictEqual(
        hardCodes(checkTimetableConflicts({ events: [exam('a', '2026-09-07', { pair: 7 })] })),
        [TIMETABLE_CONFLICT_CODE.INVALID_EVENT_SLOT],
      );
    });

    test('exam ending on pair 6 needs late authorization', () => {
      assert.deepStrictEqual(
        hardCodes(checkTimetableConflicts({ events: [exam('a', '2026-09-07', { pair: 5 })] })),
        [TIMETABLE_CONFLICT_CODE.UNAUTHORIZED_LATE_SLOT],
      );
    });
  });

  test('rejects invalid date and pair', () => {
    const report = checkTimetableConflicts({
      events: [makeEvent({ id: 'a', date: '2026-02-30' }), makeEvent({ id: 'b', pair: 8 })],
    });

    assert.deepStrictEqual(hardCodes(report), [
      TIMETABLE_CONFLICT_CODE.INVALID_EVENT_SLOT,
      TIMETABLE_CONFLICT_CODE.INVALID_EVENT_SLOT,
    ]);
  });

  test('rejects event with subgroupId but empty groupIds as MISSING_PARTICIPANTS', () => {
    const report = checkTimetableConflicts({
      events: [makeEvent({ id: 'a', subgroupId: 'KS11-1', groupIds: [] })],
    });

    assert.ok(hardCodes(report).includes(TIMETABLE_CONFLICT_CODE.MISSING_PARTICIPANTS));
  });

  test('rejects event with no participants at all as MISSING_PARTICIPANTS', () => {
    const report = checkTimetableConflicts({
      events: [makeEvent({ id: 'a', groupIds: [], studentIds: undefined, streamId: undefined })],
    });

    assert.ok(hardCodes(report).includes(TIMETABLE_CONFLICT_CODE.MISSING_PARTICIPANTS));
  });

  describe('soft penalties', () => {
    const lecture = (id: string, date: string, pair = 1): ScheduledEvent =>
      makeEvent({
        id,
        date,
        pair,
        teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
        groupIds: ['KS11', 'KS12'],
      });

    test('practice before lecture is penalized, lecture first is not', () => {
      const penalized = checkTimetableConflicts({
        events: [makeEvent({ id: 'p', date: '2026-09-07' }), lecture('l', '2026-09-09')],
      });

      assert.ok(penalized.isValid);
      assert.deepStrictEqual(softCodes(penalized), [
        TIMETABLE_SOFT_PENALTY_CODE.PRACTICE_BEFORE_LECTURE,
      ]);
      assert.equal(penalized.totalPenaltyScore, 20);
      assert.deepStrictEqual(
        softCodes(
          checkTimetableConflicts({
            events: [lecture('l', '2026-09-07'), makeEvent({ id: 'p', date: '2026-09-09' })],
          }),
        ),
        [],
      );
    });

    test('practice on the same day after the lecture is fine, before it is not', () => {
      const lectureEvent = lecture('l', '2026-09-07', 2);

      assert.deepStrictEqual(
        softCodes(
          checkTimetableConflicts({
            events: [lectureEvent, makeEvent({ id: 'p', pair: 3, groupIds: ['KS11'] })],
          }),
        ),
        [],
      );
      assert.deepStrictEqual(
        softCodes(
          checkTimetableConflicts({
            events: [lectureEvent, makeEvent({ id: 'p', pair: 1, groupIds: ['KS11'] })],
          }),
        ),
        [TIMETABLE_SOFT_PENALTY_CODE.PRACTICE_BEFORE_LECTURE],
      );
    });

    test('practice of another discipline is ignored', () => {
      assert.deepStrictEqual(
        softCodes(
          checkTimetableConflicts({
            events: [
              makeEvent({ id: 'p', disciplineTitle: 'Physics' }),
              lecture('l', '2026-09-09'),
            ],
          }),
        ),
        [],
      );
    });

    test('five pairs a day is penalized for the group and each teacher', () => {
      const events = [1, 2, 3, 4, 5].map((pair) =>
        makeEvent({ id: `e${pair}`, pair, teacherId: 't1', hasLateSlotAuthorization: true }),
      );
      const report = checkTimetableConflicts({
        events: events.map((event, index) => ({ ...event, groupIds: [`G${index}`] })),
      });
      const loaded = checkTimetableConflicts({
        events: events.map((event) => ({ ...event, teacherId: `t${event.pair}` })),
      });

      assert.deepStrictEqual(softCodes(report), [TIMETABLE_SOFT_PENALTY_CODE.EXCESSIVE_DAILY_LOAD]);
      assert.deepStrictEqual(softCodes(loaded), [TIMETABLE_SOFT_PENALTY_CODE.EXCESSIVE_DAILY_LOAD]);
      assert.equal(loaded.totalPenaltyScore, 10);
    });

    test('four pairs a day is not penalized', () => {
      const events = [1, 2, 3, 4].map((pair) => makeEvent({ id: `e${pair}`, pair }));

      assert.deepStrictEqual(softCodes(checkTimetableConflicts({ events })), []);
    });

    test('windows between pairs are penalized per free pair', () => {
      const report = checkTimetableConflicts({
        events: [makeEvent({ id: 'a', pair: 1 }), makeEvent({ id: 'b', pair: 4 })],
      });

      assert.deepStrictEqual(softCodes(report), [TIMETABLE_SOFT_PENALTY_CODE.SCHEDULE_WINDOW]);
      assert.equal(report.totalPenaltyScore, 10);
    });

    test('late Saturday-only slot is penalized', () => {
      const saturday = (pair: number): ScheduledEvent =>
        makeEvent({ id: 'a', date: '2026-09-12', pair, isSaturdayOnly: true });

      assert.deepStrictEqual(softCodes(checkTimetableConflicts({ events: [saturday(3)] })), []);
      assert.deepStrictEqual(softCodes(checkTimetableConflicts({ events: [saturday(4)] })), [
        TIMETABLE_SOFT_PENALTY_CODE.LATE_SATURDAY_SLOT,
      ]);
    });
  });
});
