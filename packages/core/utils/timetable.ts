import {
  ACADEMIC_HOURS_PER_PAIR,
  TIMETABLE_PHASE_ORDER,
  TIMETABLE_VALIDATION_ERROR,
  TIMETABLE_WEEK_PARITY,
} from '../constants/timetable.ts';
import type {
  PairsFromHoursResult,
  WeeklyPairCountsParams,
  WeeklyPairCountsResult,
} from '../types/timetable.ts';

export function getPairsFromAcademicHours(academicHours: number): PairsFromHoursResult {
  if (!Number.isInteger(academicHours) || academicHours <= 0) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_ACADEMIC_HOURS };
  }

  if (academicHours % ACADEMIC_HOURS_PER_PAIR !== 0) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.ODD_ACADEMIC_HOURS };
  }

  return { ok: true, pairs: academicHours / ACADEMIC_HOURS_PER_PAIR };
}

/**
 * Expands a pair total into per-week pair counts for the patterns the dean office approved.
 * Any other total is reported as unsupported instead of inventing week assignments.
 */
export function getWeeklyPairCounts({
  pairs,
  weeks,
  parity = TIMETABLE_WEEK_PARITY.NUMERATOR,
  order = TIMETABLE_PHASE_ORDER.WEEKLY_FIRST,
}: WeeklyPairCountsParams): WeeklyPairCountsResult {
  if (!Number.isInteger(pairs) || pairs <= 0 || !Number.isInteger(weeks) || weeks <= 0) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_PAIR_OR_WEEK_COUNT };
  }

  const parityRemainder = parity === TIMETABLE_WEEK_PARITY.NUMERATOR ? 0 : 1;
  const isParityWeek = (weekIndex: number): boolean => weekIndex % 2 === parityRemainder;
  const parityWeeks = Array.from({ length: weeks }, (_, weekIndex) => weekIndex).filter(
    isParityWeek,
  ).length;

  // Weekly: one pair every week.
  if (pairs === weeks) {
    return { ok: true, counts: Array(weeks).fill(1) };
  }

  // Alternating: one pair every other week.
  if (pairs === parityWeeks) {
    return {
      ok: true,
      counts: Array.from({ length: weeks }, (_, weekIndex) => Number(isParityWeek(weekIndex))),
    };
  }

  // Phased: half the semester weekly, the other half alternating, in the chosen order.
  if (weeks % 4 === 0 && pairs === weeks / 2 + weeks / 4) {
    const half = weeks / 2;
    const isWeeklyPhase = (weekIndex: number): boolean =>
      order === TIMETABLE_PHASE_ORDER.WEEKLY_FIRST ? weekIndex < half : weekIndex >= half;

    return {
      ok: true,
      counts: Array.from({ length: weeks }, (_, weekIndex) =>
        isWeeklyPhase(weekIndex) || isParityWeek(weekIndex) ? 1 : 0,
      ),
    };
  }

  // Weekly plus an extra pair every other week.
  if (pairs === weeks + parityWeeks) {
    return {
      ok: true,
      counts: Array.from({ length: weeks }, (_, weekIndex) => (isParityWeek(weekIndex) ? 2 : 1)),
    };
  }

  return { ok: false, error: TIMETABLE_VALIDATION_ERROR.UNSUPPORTED_PATTERN };
}
