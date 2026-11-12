export const ACADEMIC_HOURS_PER_PAIR = 2 as const;

export const DEFAULT_NOMINAL_WEEKS = 16 as const;

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

export const TIMETABLE_CONFLICT_CODE = {
  INVALID_EVENT_SLOT: 'INVALID_EVENT_SLOT',
  SUNDAY_CLASS_FORBIDDEN: 'SUNDAY_CLASS_FORBIDDEN',
  TEACHER_OVERLAP: 'TEACHER_OVERLAP',
  STUDENT_OVERLAP: 'STUDENT_OVERLAP',
  CONFIRMED_UNAVAILABILITY: 'CONFIRMED_UNAVAILABILITY',
  UNAUTHORIZED_LATE_SLOT: 'UNAUTHORIZED_LATE_SLOT',
  SATURDAY_RESTRICTION_VIOLATION: 'SATURDAY_RESTRICTION_VIOLATION',
  EXAM_INTERVAL_VIOLATION: 'EXAM_INTERVAL_VIOLATION',
  EXAM_TEACHER_OVERLAP: 'EXAM_TEACHER_OVERLAP',
  EXAM_STUDENT_OVERLAP: 'EXAM_STUDENT_OVERLAP',
  MISSING_PARTICIPANTS: 'MISSING_PARTICIPANTS',
} as const;

export type TimetableConflictCode =
  (typeof TIMETABLE_CONFLICT_CODE)[keyof typeof TIMETABLE_CONFLICT_CODE];

export const TIMETABLE_SOFT_PENALTY_CODE = {
  EXCESSIVE_DAILY_LOAD: 'EXCESSIVE_DAILY_LOAD',
  PRACTICE_BEFORE_LECTURE: 'PRACTICE_BEFORE_LECTURE',
  SCHEDULE_WINDOW: 'SCHEDULE_WINDOW',
  LATE_SATURDAY_SLOT: 'LATE_SATURDAY_SLOT',
} as const;

export type TimetableSoftPenaltyCode =
  (typeof TIMETABLE_SOFT_PENALTY_CODE)[keyof typeof TIMETABLE_SOFT_PENALTY_CODE];

// Score per violating unit: a pair above the daily limit, a free pair inside a day, one event.
export const TIMETABLE_SOFT_WEIGHT = {
  [TIMETABLE_SOFT_PENALTY_CODE.EXCESSIVE_DAILY_LOAD]: 10,
  [TIMETABLE_SOFT_PENALTY_CODE.PRACTICE_BEFORE_LECTURE]: 20,
  [TIMETABLE_SOFT_PENALTY_CODE.SCHEDULE_WINDOW]: 5,
  [TIMETABLE_SOFT_PENALTY_CODE.LATE_SATURDAY_SLOT]: 3,
} as const;

export const MAX_PREFERRED_DAILY_PAIRS = 4 as const;

export const MIN_EXAM_FREE_DAYS = 1 as const;

export const FIRST_PAIR = 1 as const;

export const LAST_PAIR = 7 as const;

export const FIRST_LATE_PAIR = 6 as const;

// Saturday-only classes are preferred up to this pair; later ones are penalized.
export const LAST_PREFERRED_SATURDAY_PAIR = 3 as const;

export const TIMETABLE_ASSIGNMENT_TEACHING_TYPE = {
  LECTURE: 'LECTURE',
  PRACTICAL: 'PRACTICAL',
  SEMINAR: 'SEMINAR',
  LABORATORY: 'LABORATORY',
} as const;

export type TimetableAssignmentTeachingType =
  (typeof TIMETABLE_ASSIGNMENT_TEACHING_TYPE)[keyof typeof TIMETABLE_ASSIGNMENT_TEACHING_TYPE];

export const TIMETABLE_TEACHING_TYPE = {
  LECTURE: 'LECTURE',
  PRACTICAL: 'PRACTICAL',
  SEMINAR: 'SEMINAR',
  LABORATORY: 'LABORATORY',
  EXAM: 'EXAM',
} as const;

export type TimetableTeachingType =
  (typeof TIMETABLE_TEACHING_TYPE)[keyof typeof TIMETABLE_TEACHING_TYPE];

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_DATE_LENGTH = 10 as const;
export const DAYS_PER_WEEK = 7 as const;
export const MS_PER_DAY = 86_400_000 as const;
export const SUNDAY = 0 as const;

export const DEFAULT_MAX_CANDIDATES = 1 as const;
export const DEFAULT_TIMEOUT_MS = 5000 as const;
export const MAX_STANDARD_PAIR = 4 as const;
export const MID_STANDARD_PAIR = 5 as const;
export const WEEKDAY_PENALTY_MULTIPLIER = 10 as const;
export const LATE_PAIR_PENALTY = 30 as const;
export const SATURDAY_LATE_PENALTY_MULTIPLIER = 50 as const;

export const SLOT_PREFERENCE = {
  PREFERRED: 'PREFERRED',
  UNDESIRABLE: 'UNDESIRABLE',
} as const;

export type SlotPreference = (typeof SLOT_PREFERENCE)[keyof typeof SLOT_PREFERENCE];

export const TEACHING_DAYS_PER_WEEK = 6 as const;
export const MAX_SLOT_PREFERENCES = TEACHING_DAYS_PER_WEEK * LAST_PAIR;
export const PREFERRED_SLOT_HEURISTIC_BONUS = -100 as const;
export const UNDESIRABLE_SLOT_HEURISTIC_PENALTY = 1000 as const;

export const DEFAULT_ICS_FOLD_LIMIT = 75 as const;
export const DEFAULT_PAIR_DURATION_MINUTES = 80 as const;
export const ICS_PRODID = '-//Karazin UniVerse//Timetable//UK' as const;

export const TEACHING_TYPE_LABELS: Readonly<Record<string, string>> = {
  LECTURE: 'Лекція',
  PRACTICAL: 'Практика',
  LABORATORY: 'Лабораторна',
  SEMINAR: 'Семінар',
  EXAM: 'Іспит',
  lecture: 'Лекція',
  practical: 'Практика',
  practice: 'Практика',
  laboratory: 'Лабораторна',
  lab: 'Лабораторна',
  seminar: 'Семінар',
  exam: 'Іспит',
};

export const EUROPE_KYIV_VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Kyiv',
  'BEGIN:DAYLIGHT',
  'TZNAME:EEST',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0300',
  'DTSTART:19700329T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZNAME:EET',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0200',
  'DTSTART:19701025T040000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
].join('\r\n');
