export const ACADEMIC_HOURS_PER_PAIR = 2 as const;

export const TIMETABLE_TIME_ZONE = 'Europe/Kyiv' as const;

// Local bell schedule. A pair is 80 clock minutes but always counts as ACADEMIC_HOURS_PER_PAIR.
export const PAIR_SCHEDULE = {
  1: { start: '08:30', end: '09:50' },
  2: { start: '10:10', end: '11:30' },
  3: { start: '12:00', end: '13:20' },
  4: { start: '13:40', end: '15:00' },
  5: { start: '15:20', end: '16:40' },
  6: { start: '17:00', end: '18:20' },
  7: { start: '18:40', end: '20:00' },
} as const;

export type PairNumber = keyof typeof PAIR_SCHEDULE;

export const EXAM_PAIR_COUNT = 2 as const;

export const TIMETABLE_VALIDATION_ERROR = {
  INVALID_ACADEMIC_HOURS: 'INVALID_ACADEMIC_HOURS',
  ODD_ACADEMIC_HOURS: 'ODD_ACADEMIC_HOURS',
  INVALID_PAIR_OR_WEEK_COUNT: 'INVALID_PAIR_OR_WEEK_COUNT',
  UNSUPPORTED_PATTERN: 'UNSUPPORTED_PATTERN',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_PAIR_NUMBER: 'INVALID_PAIR_NUMBER',
  INVALID_EXAM_START_PAIR: 'INVALID_EXAM_START_PAIR',
  INVALID_SEMESTER_CONFIG: 'INVALID_SEMESTER_CONFIG',
  INVALID_WEEKDAY: 'INVALID_WEEKDAY',
  INVALID_MAKEUP_SATURDAY: 'INVALID_MAKEUP_SATURDAY',
  SATURDAY_DISCIPLINE_MISMATCH: 'SATURDAY_DISCIPLINE_MISMATCH',
} as const;

export const TIMETABLE_WEEKDAY = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export type TimetableValidationError =
  (typeof TIMETABLE_VALIDATION_ERROR)[keyof typeof TIMETABLE_VALIDATION_ERROR];

export const TIMETABLE_WEEK_PARITY = {
  NUMERATOR: 'NUMERATOR',
  DENOMINATOR: 'DENOMINATOR',
} as const;

export type TimetableWeekParity =
  (typeof TIMETABLE_WEEK_PARITY)[keyof typeof TIMETABLE_WEEK_PARITY];

export const TIMETABLE_PHASE_ORDER = {
  WEEKLY_FIRST: 'WEEKLY_FIRST',
  ALTERNATING_FIRST: 'ALTERNATING_FIRST',
} as const;

export type TimetablePhaseOrder =
  (typeof TIMETABLE_PHASE_ORDER)[keyof typeof TIMETABLE_PHASE_ORDER];

export const TIMETABLE_SKIP_REASON = {
  EXCLUDED_DATE: 'EXCLUDED_DATE',
  BEFORE_SEMESTER_START: 'BEFORE_SEMESTER_START',
} as const;

export type TimetableSkipReason =
  (typeof TIMETABLE_SKIP_REASON)[keyof typeof TIMETABLE_SKIP_REASON];
