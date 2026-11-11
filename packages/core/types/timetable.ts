import type {
  TimetableAssignmentTeachingType,
  TimetableConflictCode,
  TimetablePhaseOrder,
  TimetableSkipReason,
  TimetableSoftPenaltyCode,
  TimetableTeachingType,
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

/**
 * One class on one date and pair. A shared stream class is a single event listing every
 * participating group, e.g. groupIds: ['KS11', 'KS12'] with a streamId; duplicate records of
 * the same stream and 	eachingAssignmentId are not treated as conflicting.
 */
export type ScheduledEvent = {
  id: string;
  teachingAssignmentId: string;
  disciplineTitle: string;
  teachingType: TimetableTeachingType;
  teacherId: string;
  groupIds: string[];
  date: string;
  pair: number;
  subgroupId?: string;
  streamId?: string;
  studentIds?: string[];
  pairSpan?: number;
  hasLateSlotAuthorization?: boolean;
  isSaturdayOnly?: boolean;
  isMakeupSaturday?: boolean;
};

export type TeacherUnavailability = {
  teacherId: string;
  date: string;
  pair: number;
  isConfirmed: boolean;
};

export type CheckTimetableConflictsParams = {
  events: ScheduledEvent[];
  unavailability?: TeacherUnavailability[];
};

export type HardConflict = {
  code: TimetableConflictCode;
  message: string;
  eventIds: string[];
  details?: Record<string, unknown>;
};

export type SoftPenalty = {
  code: TimetableSoftPenaltyCode;
  score: number;
  message: string;
  eventIds: string[];
};

export type ConflictReport = {
  isValid: boolean;
  hardConflicts: HardConflict[];
  softPenalties: SoftPenalty[];
  totalPenaltyScore: number;
};

export type EventSlot = {
  event: ScheduledEvent;
  dateMs: number;
  firstPair: number;
  lastPair: number;
};

export type DayOccupancy = {
  label: string;
  date: string;
  pairs: Set<number>;
  eventIds: Set<string>;
};

export type TeachingDemand = {
  id: string;
  disciplineTitle: string;
  teachingType: TimetableTeachingType;
  teacherId: string;
  groupIds: string[];
  academicHours: number;
  subgroupId?: string;
  streamId?: string;
  isSaturdayOnly?: boolean;
  hasLateSlotAuthorization?: boolean;
  parity?: TimetableWeekParity;
  order?: TimetablePhaseOrder;
  studentIds?: string[];
};

export type GenerateTimetableOptions = {
  maxCandidates?: number;
  timeoutMs?: number;
};

export type GenerateTimetableParams = {
  demands: TeachingDemand[];
  calendar: SemesterCalendarConfig;
  unavailability?: TeacherUnavailability[];
  options?: GenerateTimetableOptions;
};

export type TimetableCandidate = {
  events: ScheduledEvent[];
  penaltyScore: number;
};

export type CandidateSlot = {
  demandIndex: number;
  events: ScheduledEvent[];
  globalIndex: number;
  heuristicCost: number;
  pair: number;
  timeKeys: Set<string>;
  weekday: number;
  layerIndex?: number;
  unitIndex?: number;
};

export type SchedulableDemandLayer = {
  demand: TeachingDemand;
  demandIndex: number;
  layerIndex: number;
  requiredPairs: number;
  unitIndex: number;
  weeklyCounts: number[];
};

export type GenerateTimetableDiagnostics = {
  statesExplored: number;
  timeMs: number;
};

export type GenerateTimetableErrorCode = 'NO_FEASIBLE_SOLUTION' | 'TIMEOUT' | 'INVALID_INPUT';

export type GenerateTimetableResult =
  | {
      ok: true;
      candidates: TimetableCandidate[];
      diagnostics: GenerateTimetableDiagnostics;
    }
  | {
      ok: false;
      error: GenerateTimetableErrorCode;
      diagnostics: GenerateTimetableDiagnostics;
    };

export type MakeupSaturdayRequest = {
  date: string;
  followsWeekday: number;
};

export type CreateSemesterCalendarRequest = {
  academicYear: string;
  semester: number;
  startDate: string;
  teachingWeeks: number;
  excludedDates?: string[];
  makeupSaturdays?: MakeupSaturdayRequest[];
};

export type UpdateSemesterCalendarRequest = Partial<CreateSemesterCalendarRequest>;

export type CreateTeachingAssignmentRequest = {
  curriculumPlanId: string;
  disciplineTitle: string;
  teachingType: TimetableAssignmentTeachingType;
  academicHours: number;
  teacherId: string;
  groupId?: string;
  subgroupId?: string;
  streamId?: string;
  isSaturdayOnly?: boolean;
  hasLateSlotAuthorization?: boolean;
  meetingUrl?: string;
};

export type UpdateTeachingAssignmentRequest = Partial<CreateTeachingAssignmentRequest>;

export type CreateTeacherUnavailabilityRequest = {
  date: string;
  pair: number;
  teacherId?: string;
  reason?: string;
};

export type ConfirmTeacherUnavailabilityRequest = {
  isConfirmed: boolean;
  reason?: string;
};
