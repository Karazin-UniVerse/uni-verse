import type {
  TimetablePhaseOrder,
  TimetableSkipReason,
  TimetableValidationError,
  TimetableWeekParity,
} from '../constants/timetable.ts';

export type PairsFromHoursResult =
  { ok: true; pairs: number } | { ok: false; error: TimetableValidationError };

export type WeeklyPairCountsParams = {
  pairs: number;
  weeks: number;
  parity?: TimetableWeekParity;
  order?: TimetablePhaseOrder;
};

export type WeeklyPairCountsResult =
  { ok: true; counts: number[] } | { ok: false; error: TimetableValidationError };

export type PairInstantsResult =
  { ok: true; start: Date; end: Date } | { ok: false; error: TimetableValidationError };

/**
 * `startDate` is the first teaching day (ISO). Week 0 spans its Monday..Sunday; dates in week 0
 * before `startDate` are skipped. Each makeup Saturday is an extra day running the timetable of
 * `followsWeekday` (1..5); it does not replace that weekday in the same week.
 */
export type SemesterCalendarConfig = {
  startDate: string;
  teachingWeeks: number;
  excludedDates: string[];
  makeupSaturdays: Array<{ date: string; followsWeekday: number }>;
};

export type ExpandSlotParams = {
  weekday: number;
  pair: number;
  weeklyCounts: number[];
  calendar: SemesterCalendarConfig;
  isSaturdayOnly?: boolean;
};

export type DatedSlotOccurrence = {
  date: string;
  weekIndex: number;
  pair: number;
  isMakeup?: boolean;
  originalWeekday?: number;
};

export type SkippedSlotOccurrence = {
  date: string;
  weekIndex: number;
  pair: number;
  reason: TimetableSkipReason;
};

export type ExpandSlotResult =
  | { ok: true; occurrences: DatedSlotOccurrence[]; skipped: SkippedSlotOccurrence[] }
  | { ok: false; error: TimetableValidationError };
