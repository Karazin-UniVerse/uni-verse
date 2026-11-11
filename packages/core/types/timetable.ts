import type {
  TimetablePhaseOrder,
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
