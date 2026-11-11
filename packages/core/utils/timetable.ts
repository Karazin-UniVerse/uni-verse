import {
  ACADEMIC_HOURS_PER_PAIR,
  EXAM_PAIR_COUNT,
  PAIR_SCHEDULE,
  TIMETABLE_PHASE_ORDER,
  TIMETABLE_SKIP_REASON,
  TIMETABLE_TIME_ZONE,
  TIMETABLE_VALIDATION_ERROR,
  TIMETABLE_WEEK_PARITY,
  TIMETABLE_WEEKDAY,
} from '../constants/timetable.ts';
import type { PairNumber } from '../constants/timetable.ts';
import type {
  DatedSlotOccurrence,
  ExpandSlotParams,
  ExpandSlotResult,
  PairInstantsResult,
  PairsFromHoursResult,
  SkippedSlotOccurrence,
  WeeklyPairCountsParams,
  WeeklyPairCountsResult,
} from '../types/timetable.ts';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_LENGTH = 10;
const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 86_400_000;

const TIME_ZONE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMETABLE_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

function formatIsoDate(dateMs: number): string {
  return new Date(dateMs).toISOString().slice(0, ISO_DATE_LENGTH);
}

/** Strictly parses `YYYY-MM-DD` into UTC-midnight milliseconds; rejects dates like 2026-02-30. */
function parseIsoDate(date: string): number | null {
  if (!ISO_DATE_PATTERN.test(date)) {
    return null;
  }

  const dateMs = Date.parse(`${date}T00:00:00Z`);

  return Number.isNaN(dateMs) || formatIsoDate(dateMs) !== date ? null : dateMs;
}

function isPairNumber(pair: number): pair is PairNumber {
  return Object.hasOwn(PAIR_SCHEDULE, pair);
}

function getTimeZoneOffsetMs(instantMs: number): number {
  const parts = Object.fromEntries(
    TIME_ZONE_FORMAT.formatToParts(instantMs).map(({ type, value }) => [type, Number(value)]),
  );
  const wallClockMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return wallClockMs - instantMs;
}

/** Resolves a local `HH:mm` on a calendar date through timezone rules, never a fixed offset. */
function getLocalInstant(dateMs: number, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const wallClockMs = new Date(dateMs).setUTCHours(hours, minutes);
  // The second lookup corrects the offset when the first guess lands across a DST change.
  const approximateInstantMs = wallClockMs - getTimeZoneOffsetMs(wallClockMs);

  return new Date(wallClockMs - getTimeZoneOffsetMs(approximateInstantMs));
}

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
    return { ok: true, counts: Array.from({ length: weeks }, () => 1) };
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

export function getPairInstants(date: string, pair: number): PairInstantsResult {
  if (!isPairNumber(pair)) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_PAIR_NUMBER };
  }

  const dateMs = parseIsoDate(date);

  if (dateMs === null) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_DATE };
  }

  return {
    ok: true,
    start: getLocalInstant(dateMs, PAIR_SCHEDULE[pair].start),
    end: getLocalInstant(dateMs, PAIR_SCHEDULE[pair].end),
  };
}

function getMondayMs(dateMs: number): number {
  const daysSinceMonday = (new Date(dateMs).getUTCDay() + 6) % DAYS_PER_WEEK;

  return dateMs - daysSinceMonday * MS_PER_DAY;
}

function parseDates(dates: string[]): number[] | null {
  const parsed = dates.map(parseIsoDate);

  return parsed.every((dateMs) => dateMs !== null) ? parsed : null;
}

/**
 * Expands one weekly slot into dated occurrences. `weeklyCounts` already encodes week parity,
 * so a week with a zero count never yields a regular occurrence. Regular dates that are excluded
 * or before `startDate` go to `skipped`. A makeup Saturday is an additional day running the
 * timetable of the weekday it follows; it does not replace that weekday in its own week.
 */
export function expandSlotOccurrences({
  weekday,
  pair,
  weeklyCounts,
  calendar,
  isSaturdayOnly = false,
}: ExpandSlotParams): ExpandSlotResult {
  const { startDate, teachingWeeks, excludedDates, makeupSaturdays } = calendar;

  if (
    !Number.isInteger(weekday) ||
    weekday < TIMETABLE_WEEKDAY.MONDAY ||
    weekday > TIMETABLE_WEEKDAY.SATURDAY
  ) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_WEEKDAY };
  }

  if (isSaturdayOnly !== (weekday === TIMETABLE_WEEKDAY.SATURDAY)) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.SATURDAY_DISCIPLINE_MISMATCH };
  }

  if (!isPairNumber(pair)) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_PAIR_NUMBER };
  }

  const startMs = parseIsoDate(startDate);
  const excludedMs = parseDates(excludedDates);
  const makeupMs = parseDates(makeupSaturdays.map(({ date }) => date));

  if (startMs === null || excludedMs === null || makeupMs === null) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_DATE };
  }

  if (
    !Number.isInteger(teachingWeeks) ||
    teachingWeeks <= 0 ||
    weeklyCounts.length !== teachingWeeks ||
    !weeklyCounts.every((count) => Number.isInteger(count) && count >= 0)
  ) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_SEMESTER_CONFIG };
  }

  const firstMondayMs = getMondayMs(startMs);
  const excluded = new Set(excludedMs);
  const occurrences: DatedSlotOccurrence[] = [];
  const skipped: SkippedSlotOccurrence[] = [];
  const getWeekdayMs = (weekIndex: number, targetWeekday: number): number =>
    firstMondayMs + (weekIndex * DAYS_PER_WEEK + targetWeekday - 1) * MS_PER_DAY;

  const makeupDates = new Set<number>();
  const makeups: Array<{ dateMs: number; weekIndex: number }> = [];

  for (const [index, { followsWeekday }] of makeupSaturdays.entries()) {
    const dateMs = makeupMs[index];
    const weekIndex = Math.floor((dateMs - firstMondayMs) / MS_PER_DAY / DAYS_PER_WEEK);
    const isSaturday = dateMs === getWeekdayMs(weekIndex, TIMETABLE_WEEKDAY.SATURDAY);
    const isFollowsValid =
      Number.isInteger(followsWeekday) &&
      followsWeekday >= TIMETABLE_WEEKDAY.MONDAY &&
      followsWeekday < TIMETABLE_WEEKDAY.SATURDAY;

    if (
      !isSaturday ||
      !isFollowsValid ||
      weekIndex < 0 ||
      weekIndex >= teachingWeeks ||
      makeupDates.has(dateMs)
    ) {
      return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_MAKEUP_SATURDAY };
    }

    makeupDates.add(dateMs);

    if (followsWeekday === weekday) {
      makeups.push({ dateMs, weekIndex });
    }
  }

  const place = (dateMs: number, weekIndex: number, makeup: boolean): void => {
    const date = formatIsoDate(dateMs);
    const reason =
      dateMs < startMs
        ? TIMETABLE_SKIP_REASON.BEFORE_SEMESTER_START
        : excluded.has(dateMs)
          ? TIMETABLE_SKIP_REASON.EXCLUDED_DATE
          : null;

    if (reason !== null) {
      skipped.push({ date, weekIndex, pair, reason });
    } else if (makeup) {
      occurrences.push({ date, weekIndex, pair, isMakeup: true, originalWeekday: weekday });
    } else {
      occurrences.push({ date, weekIndex, pair });
    }
  };

  for (let weekIndex = 0; weekIndex < teachingWeeks; weekIndex += 1) {
    if (weeklyCounts[weekIndex] > 0) {
      place(getWeekdayMs(weekIndex, weekday), weekIndex, false);
    }
  }

  for (const { dateMs, weekIndex } of makeups) {
    place(dateMs, weekIndex, true);
  }

  occurrences.sort((first, second) => first.date.localeCompare(second.date));
  skipped.sort((first, second) => first.date.localeCompare(second.date));

  return { ok: true, occurrences, skipped };
}

/** An exam is one event spanning consecutive pairs and the break between them. */
export function getExamInstants(date: string, startPair: number): PairInstantsResult {
  const endPair = startPair + EXAM_PAIR_COUNT - 1;

  if (!isPairNumber(startPair) || !isPairNumber(endPair)) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_EXAM_START_PAIR };
  }

  const dateMs = parseIsoDate(date);

  if (dateMs === null) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_DATE };
  }

  return {
    ok: true,
    start: getLocalInstant(dateMs, PAIR_SCHEDULE[startPair].start),
    end: getLocalInstant(dateMs, PAIR_SCHEDULE[endPair].end),
  };
}
