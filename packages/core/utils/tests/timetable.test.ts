import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  TIMETABLE_PHASE_ORDER,
  TIMETABLE_VALIDATION_ERROR,
  TIMETABLE_WEEK_PARITY,
} from '../../constants/timetable.ts';
import { getPairsFromAcademicHours, getWeeklyPairCounts } from '../timetable.ts';

const sum = (counts: number[]): number => counts.reduce((total, count) => total + count, 0);

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
});
