import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  TIMETABLE_PHASE_ORDER,
  TIMETABLE_SKIP_REASON,
  TIMETABLE_VALIDATION_ERROR,
  TIMETABLE_WEEK_PARITY,
  TIMETABLE_WEEKDAY,
} from '../../constants/timetable.ts';
import type { TimetableValidationError } from '../../constants/timetable.ts';
import type {
  ExpandSlotParams,
  ExpandSlotResult,
  PairInstantsResult,
  SemesterCalendarConfig,
} from '../../types/timetable.ts';
import {
  expandSlotOccurrences,
  getExamInstants,
  getPairInstants,
  getPairsFromAcademicHours,
  getWeeklyPairCounts,
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

    test('reports an unsupported pattern instead of inventing weeks', () => {
      // 18 pairs over 16 weeks needs two extra pairs on dean-chosen weeks.
      assert.deepStrictEqual(getWeeklyPairCounts({ pairs: 18, weeks: 16 }), {
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
