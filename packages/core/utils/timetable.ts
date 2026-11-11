import {
  ACADEMIC_HOURS_PER_PAIR,
  EXAM_PAIR_COUNT,
  FIRST_LATE_PAIR,
  FIRST_PAIR,
  LAST_PAIR,
  LAST_PREFERRED_SATURDAY_PAIR,
  MAX_PREFERRED_DAILY_PAIRS,
  MIN_EXAM_FREE_DAYS,
  PAIR_SCHEDULE,
  TIMETABLE_CONFLICT_CODE,
  TIMETABLE_PHASE_ORDER,
  TIMETABLE_SKIP_REASON,
  TIMETABLE_SOFT_PENALTY_CODE,
  TIMETABLE_SOFT_WEIGHT,
  TIMETABLE_TEACHING_TYPE,
  TIMETABLE_TIME_ZONE,
  TIMETABLE_VALIDATION_ERROR,
  TIMETABLE_WEEK_PARITY,
  TIMETABLE_WEEKDAY,
} from '../constants/timetable.ts';
import type { PairNumber } from '../constants/timetable.ts';
import type {
  CandidateSlot,
  CheckTimetableConflictsParams,
  ConflictReport,
  DatedSlotOccurrence,
  DayOccupancy,
  EventSlot,
  ExpandSlotParams,
  ExpandSlotResult,
  GenerateIcsOptions,
  GenerateTimetableDiagnostics,
  GenerateTimetableParams,
  GenerateTimetableResult,
  HardConflict,
  PairInstantsResult,
  PairsFromHoursResult,
  SchedulableDemandLayer,
  ScheduledEvent,
  SkippedSlotOccurrence,
  SoftPenalty,
  TeacherUnavailability,
  TeachingDemand,
  TimetableCandidate,
  WeeklyPairCountsParams,
  WeeklyPairCountsResult,
} from '../types/timetable.ts';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_LENGTH = 10;
const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 86_400_000;
const SUNDAY = 0;

const DEFAULT_MAX_CANDIDATES = 1;
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_STANDARD_PAIR = 4;
const MID_STANDARD_PAIR = 5;
const WEEKDAY_PENALTY_MULTIPLIER = 10;
const LATE_PAIR_PENALTY = 30;
const SATURDAY_LATE_PENALTY_MULTIPLIER = 50;

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
    TIME_ZONE_FORMAT.formatToParts(instantMs).map(({ type, value }): [string, number] => [
      type,
      Number(value),
    ]),
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
  const parityWeeks = Array.from({ length: weeks }, (_, weekIndex): number => weekIndex).filter(
    isParityWeek,
  ).length;

  // Weekly: one pair every week.
  if (pairs === weeks) {
    return { ok: true, counts: Array.from({ length: weeks }, (): number => 1) };
  }

  // Alternating: one pair every other week.
  if (pairs === parityWeeks) {
    return {
      ok: true,
      counts: Array.from({ length: weeks }, (_, weekIndex): number =>
        Number(isParityWeek(weekIndex)),
      ),
    };
  }

  // Phased: half the semester weekly, the other half alternating, in the chosen order.
  if (weeks % 4 === 0 && pairs === weeks / 2 + weeks / 4) {
    const half = weeks / 2;
    const isWeeklyPhase = (weekIndex: number): boolean =>
      order === TIMETABLE_PHASE_ORDER.WEEKLY_FIRST ? weekIndex < half : weekIndex >= half;

    return {
      ok: true,
      counts: Array.from({ length: weeks }, (_, weekIndex): number =>
        isWeeklyPhase(weekIndex) || isParityWeek(weekIndex) ? 1 : 0,
      ),
    };
  }

  // Weekly plus an extra pair every other week.
  if (pairs === weeks + parityWeeks) {
    return {
      ok: true,
      counts: Array.from({ length: weeks }, (_, weekIndex): number =>
        isParityWeek(weekIndex) ? 2 : 1,
      ),
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
  const parsed: number[] = [];

  for (const date of dates) {
    const dateMs = parseIsoDate(date);

    if (dateMs === null) {
      return null;
    }

    parsed.push(dateMs);
  }

  return parsed;
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
  const makeupMs = parseDates(makeupSaturdays.map(({ date }): string => date));

  if (startMs === null || excludedMs === null || makeupMs === null) {
    return { ok: false, error: TIMETABLE_VALIDATION_ERROR.INVALID_DATE };
  }

  if (
    !Number.isInteger(teachingWeeks) ||
    teachingWeeks <= 0 ||
    weeklyCounts.length !== teachingWeeks ||
    !weeklyCounts.every((count): boolean => Number.isInteger(count) && count >= 0)
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

  occurrences.sort((first, second): number => first.date.localeCompare(second.date));
  skipped.sort((first, second): number => first.date.localeCompare(second.date));

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

function getEventSpan(event: ScheduledEvent): number {
  return (
    event.pairSpan ?? (event.teachingType === TIMETABLE_TEACHING_TYPE.EXAM ? EXAM_PAIR_COUNT : 1)
  );
}

function toEventSlot(event: ScheduledEvent): EventSlot | null {
  const dateMs = parseIsoDate(event.date);
  const span = getEventSpan(event);
  const lastPair = event.pair + span - 1;
  const isExam = event.teachingType === TIMETABLE_TEACHING_TYPE.EXAM;

  if (
    dateMs === null ||
    !Number.isInteger(event.pair) ||
    !Number.isInteger(span) ||
    event.pair < FIRST_PAIR ||
    span < 1 ||
    lastPair > LAST_PAIR ||
    (isExam && span !== EXAM_PAIR_COUNT)
  ) {
    return null;
  }

  return { event, dateMs, firstPair: event.pair, lastPair };
}

function isSlotOverlap(first: EventSlot, second: EventSlot): boolean {
  return (
    first.dateMs === second.dateMs &&
    first.firstPair <= second.lastPair &&
    second.firstPair <= first.lastPair
  );
}

/**
 * Explicit student sets win when both events carry them. Otherwise students intersect through a
 * shared stream or a shared group; two different subgroups of one group never intersect.
 */
function hasStudentIntersection(first: ScheduledEvent, second: ScheduledEvent): boolean {
  if (first.studentIds && second.studentIds) {
    const firstStudents = new Set(first.studentIds);

    return second.studentIds.some((studentId): boolean => firstStudents.has(studentId));
  }

  const hasSharedGroup = first.groupIds.some((groupId): boolean =>
    second.groupIds.includes(groupId),
  );

  if (!hasSharedGroup) {
    return first.streamId !== undefined && first.streamId === second.streamId;
  }

  return (
    first.subgroupId === undefined ||
    second.subgroupId === undefined ||
    first.subgroupId === second.subgroupId
  );
}

/** Two records of one stream class (same stream and assignment) describe a single lesson. */
function isSameStreamClass(first: ScheduledEvent, second: ScheduledEvent): boolean {
  return (
    first.streamId !== undefined &&
    first.streamId === second.streamId &&
    first.teachingAssignmentId === second.teachingAssignmentId
  );
}

function getOverlapConflicts(slots: EventSlot[]): HardConflict[] {
  const conflicts: HardConflict[] = [];

  for (const [index, first] of slots.entries()) {
    for (const second of slots.slice(index + 1)) {
      if (!isSlotOverlap(first, second)) {
        continue;
      }

      const eventIds = [first.event.id, second.event.id];
      const isExam =
        first.event.teachingType === TIMETABLE_TEACHING_TYPE.EXAM ||
        second.event.teachingType === TIMETABLE_TEACHING_TYPE.EXAM;
      const details = { date: first.event.date, pair: Math.max(first.firstPair, second.firstPair) };

      if (isSameStreamClass(first.event, second.event)) {
        continue;
      }

      if (first.event.teacherId === second.event.teacherId) {
        conflicts.push({
          code: isExam
            ? TIMETABLE_CONFLICT_CODE.EXAM_TEACHER_OVERLAP
            : TIMETABLE_CONFLICT_CODE.TEACHER_OVERLAP,
          message: `Teacher ${first.event.teacherId} is double booked`,
          eventIds,
          details: { ...details, teacherId: first.event.teacherId },
        });
      }

      if (hasStudentIntersection(first.event, second.event)) {
        conflicts.push({
          code: isExam
            ? TIMETABLE_CONFLICT_CODE.EXAM_STUDENT_OVERLAP
            : TIMETABLE_CONFLICT_CODE.STUDENT_OVERLAP,
          message: 'Events share students at the same time',
          eventIds,
          details,
        });
      }
    }
  }

  return conflicts;
}

function getUnavailabilityConflicts(
  slots: EventSlot[],
  unavailability: TeacherUnavailability[],
): HardConflict[] {
  const confirmed = unavailability.filter(({ isConfirmed }): boolean => isConfirmed);

  return slots.flatMap(({ event, firstPair, lastPair }): HardConflict[] =>
    confirmed
      .filter(
        (entry): boolean =>
          entry.teacherId === event.teacherId &&
          entry.date === event.date &&
          entry.pair >= firstPair &&
          entry.pair <= lastPair,
      )
      .map((entry): HardConflict => ({
        code: TIMETABLE_CONFLICT_CODE.CONFIRMED_UNAVAILABILITY,
        message: `Teacher ${event.teacherId} is unavailable on ${entry.date} pair ${entry.pair}`,
        eventIds: [event.id],
        details: { date: entry.date, pair: entry.pair, teacherId: event.teacherId },
      })),
  );
}

function getCalendarRestrictionConflicts(slots: EventSlot[]): HardConflict[] {
  const conflicts: HardConflict[] = [];

  for (const { event, dateMs, lastPair } of slots) {
    const isExam = event.teachingType === TIMETABLE_TEACHING_TYPE.EXAM;
    const dayOfWeek = new Date(dateMs).getUTCDay();
    const isSaturday = dayOfWeek === TIMETABLE_WEEKDAY.SATURDAY;
    const isSunday = dayOfWeek === SUNDAY;

    if (isSunday) {
      conflicts.push({
        code: TIMETABLE_CONFLICT_CODE.SUNDAY_CLASS_FORBIDDEN,
        message: `Sunday class is forbidden: ${event.date}`,
        eventIds: [event.id],
        details: { date: event.date },
      });
    }

    if (lastPair >= FIRST_LATE_PAIR && !event.hasLateSlotAuthorization) {
      conflicts.push({
        code: TIMETABLE_CONFLICT_CODE.UNAUTHORIZED_LATE_SLOT,
        message: `Pair ${lastPair} requires dean authorization`,
        eventIds: [event.id],
        details: { date: event.date, pair: lastPair },
      });
    }

    const isSaturdayOnlyOnWeekday = event.isSaturdayOnly === true && !isSaturday;
    const isWeekdayOnlyOnSaturday =
      isSaturday && !isExam && event.isSaturdayOnly !== true && event.isMakeupSaturday !== true;

    if (isSaturdayOnlyOnWeekday || isWeekdayOnlyOnSaturday) {
      conflicts.push({
        code: TIMETABLE_CONFLICT_CODE.SATURDAY_RESTRICTION_VIOLATION,
        message: isSaturdayOnlyOnWeekday
          ? 'Saturday-only discipline scheduled on a weekday'
          : 'Weekday discipline scheduled on a non-makeup Saturday',
        eventIds: [event.id],
        details: { date: event.date },
      });
    }
  }

  return conflicts;
}

/** Consecutive exams of one group need MIN_EXAM_FREE_DAYS full exam-free calendar days. */
function getExamIntervalConflicts(slots: EventSlot[]): HardConflict[] {
  const examsByGroup = new Map<string, EventSlot[]>();

  for (const slot of slots) {
    if (slot.event.teachingType !== TIMETABLE_TEACHING_TYPE.EXAM) {
      continue;
    }

    for (const groupId of slot.event.groupIds) {
      examsByGroup.set(groupId, [...(examsByGroup.get(groupId) ?? []), slot]);
    }
  }

  const conflicts: HardConflict[] = [];

  for (const [groupId, exams] of examsByGroup) {
    const sorted = [...exams].sort((first, second): number => first.dateMs - second.dateMs);

    for (const [index, next] of sorted.slice(1).entries()) {
      const previous = sorted[index];
      const freeDays = (next.dateMs - previous.dateMs) / MS_PER_DAY - 1;

      if (freeDays < MIN_EXAM_FREE_DAYS) {
        conflicts.push({
          code: TIMETABLE_CONFLICT_CODE.EXAM_INTERVAL_VIOLATION,
          message: `Group ${groupId} needs ${MIN_EXAM_FREE_DAYS} exam-free day(s) between exams`,
          eventIds: [previous.event.id, next.event.id],
          details: { groupId, freeDays },
        });
      }
    }
  }

  return conflicts;
}

function getDayOccupancies(slots: EventSlot[]): DayOccupancy[] {
  const occupancies = new Map<string, DayOccupancy>();

  for (const { event, firstPair, lastPair } of slots) {
    const labels = [
      `teacher ${event.teacherId}`,
      ...event.groupIds.map((id): string => `group ${id}`),
    ];

    for (const label of labels) {
      const key = `${label}|${event.date}`;
      const occupancy = occupancies.get(key) ?? {
        label,
        date: event.date,
        pairs: new Set<number>(),
        eventIds: new Set<string>(),
      };

      for (let pair = firstPair; pair <= lastPair; pair += 1) {
        occupancy.pairs.add(pair);
      }

      occupancy.eventIds.add(event.id);
      occupancies.set(key, occupancy);
    }
  }

  return [...occupancies.values()];
}

function getLoadAndWindowPenalties(slots: EventSlot[]): SoftPenalty[] {
  const penalties: SoftPenalty[] = [];

  for (const { label, date, pairs, eventIds } of getDayOccupancies(slots)) {
    const pairNumbers = [...pairs];
    const excess = pairs.size - MAX_PREFERRED_DAILY_PAIRS;
    const windows = Math.max(...pairNumbers) - Math.min(...pairNumbers) + 1 - pairs.size;

    if (excess > 0) {
      const code = TIMETABLE_SOFT_PENALTY_CODE.EXCESSIVE_DAILY_LOAD;

      penalties.push({
        code,
        score: excess * TIMETABLE_SOFT_WEIGHT[code],
        message: `${label} has ${pairs.size} pairs on ${date}`,
        eventIds: [...eventIds],
      });
    }

    if (windows > 0) {
      const code = TIMETABLE_SOFT_PENALTY_CODE.SCHEDULE_WINDOW;

      penalties.push({
        code,
        score: windows * TIMETABLE_SOFT_WEIGHT[code],
        message: `${label} has ${windows} free pair(s) between classes on ${date}`,
        eventIds: [...eventIds],
      });
    }
  }

  return penalties;
}

function compareSlots(first: EventSlot, second: EventSlot): number {
  return first.dateMs - second.dateMs || first.firstPair - second.firstPair;
}

function isBeforeSlot(first: EventSlot, second: EventSlot): boolean {
  return compareSlots(first, second) < 0;
}

function getPrecedencePenalties(slots: EventSlot[]): SoftPenalty[] {
  const lectures = slots.filter(
    ({ event }): boolean => event.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE,
  );
  const penalties: SoftPenalty[] = [];

  for (const practice of slots) {
    const { teachingType, disciplineTitle, groupIds } = practice.event;

    if (
      teachingType === TIMETABLE_TEACHING_TYPE.LECTURE ||
      teachingType === TIMETABLE_TEACHING_TYPE.EXAM
    ) {
      continue;
    }

    const groupLectures = lectures.filter(
      ({ event }): boolean =>
        event.disciplineTitle === disciplineTitle &&
        event.groupIds.some((groupId): boolean => groupIds.includes(groupId)),
    );
    const earliest = [...groupLectures].sort((first, second): number => {
      if (first.event.date !== second.event.date) {
        return first.event.date.localeCompare(second.event.date);
      }

      return first.firstPair - second.firstPair;
    })[0];

    if (earliest && isBeforeSlot(practice, earliest)) {
      const code = TIMETABLE_SOFT_PENALTY_CODE.PRACTICE_BEFORE_LECTURE;

      penalties.push({
        code,
        score: TIMETABLE_SOFT_WEIGHT[code],
        message: `${disciplineTitle}: ${teachingType} on ${practice.event.date} precedes the first lecture`,
        eventIds: [practice.event.id, earliest.event.id],
      });
    }
  }

  return penalties;
}

function getLateSaturdayPenalties(slots: EventSlot[]): SoftPenalty[] {
  return slots
    .filter(
      ({ event, lastPair }): boolean =>
        event.isSaturdayOnly === true && lastPair > LAST_PREFERRED_SATURDAY_PAIR,
    )
    .map(({ event }): SoftPenalty => ({
      code: TIMETABLE_SOFT_PENALTY_CODE.LATE_SATURDAY_SLOT,
      score: TIMETABLE_SOFT_WEIGHT[TIMETABLE_SOFT_PENALTY_CODE.LATE_SATURDAY_SLOT],
      message: `Saturday-only class on ${event.date} should end by pair ${LAST_PREFERRED_SATURDAY_PAIR}`,
      eventIds: [event.id],
    }));
}

/**
 * Pure validation of a timetable before persistence. Hard conflicts make it invalid; soft
 * penalties only lower its quality score. Events with an unusable date or pair range are reported
 * and excluded from the remaining checks.
 */
export function checkTimetableConflicts({
  events,
  unavailability = [],
}: CheckTimetableConflictsParams): ConflictReport {
  const slots = events.flatMap((event): EventSlot[] => {
    const slot = toEventSlot(event);

    return slot !== null ? [slot] : [];
  });
  const invalidConflicts: HardConflict[] = events
    .filter((event): boolean => toEventSlot(event) === null)
    .map((event): HardConflict => ({
      code: TIMETABLE_CONFLICT_CODE.INVALID_EVENT_SLOT,
      message: `Event ${event.id} has an invalid date, pair or pair span`,
      eventIds: [event.id],
    }));
  const hardConflicts = [
    ...invalidConflicts,
    ...getOverlapConflicts(slots),
    ...getUnavailabilityConflicts(slots, unavailability),
    ...getCalendarRestrictionConflicts(slots),
    ...getExamIntervalConflicts(slots),
  ];
  const softPenalties = [
    ...getLoadAndWindowPenalties(slots),
    ...getPrecedencePenalties(slots),
    ...getLateSaturdayPenalties(slots),
  ];

  return {
    isValid: hardConflicts.length === 0,
    hardConflicts,
    softPenalties,
    totalPenaltyScore: softPenalties.reduce((total, { score }): number => total + score, 0),
  };
}

function computeSlotHeuristicCost(demand: TeachingDemand, weekday: number, pair: number): number {
  if (demand.isSaturdayOnly) {
    if (pair > LAST_PREFERRED_SATURDAY_PAIR) {
      return (pair - LAST_PREFERRED_SATURDAY_PAIR) * SATURDAY_LATE_PENALTY_MULTIPLIER;
    }

    return pair;
  }

  let cost = 0;

  if (demand.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE) {
    cost += weekday * WEEKDAY_PENALTY_MULTIPLIER;
  } else {
    cost += (6 - weekday) * WEEKDAY_PENALTY_MULTIPLIER;
  }

  if (pair <= MAX_STANDARD_PAIR) {
    cost += pair;
  } else if (pair === MID_STANDARD_PAIR) {
    cost += WEEKDAY_PENALTY_MULTIPLIER;
  } else {
    cost += LATE_PAIR_PENALTY + pair;
  }

  return cost;
}

function hasStudentConflict(first: TeachingDemand, second: TeachingDemand): boolean {
  if (first.studentIds && second.studentIds) {
    const firstStudents = new Set(first.studentIds);

    return second.studentIds.some((studentId): boolean => firstStudents.has(studentId));
  }

  const hasSharedGroup = first.groupIds.some((groupId): boolean =>
    second.groupIds.includes(groupId),
  );

  if (!hasSharedGroup) {
    return first.streamId !== undefined && first.streamId === second.streamId;
  }

  return (
    first.subgroupId === undefined ||
    second.subgroupId === undefined ||
    first.subgroupId === second.subgroupId
  );
}

function hasTeacherConflict(first: TeachingDemand, second: TeachingDemand): boolean {
  if (first.teacherId !== second.teacherId) {
    return false;
  }

  if (
    first.streamId !== undefined &&
    first.streamId === second.streamId &&
    first.id === second.id
  ) {
    return false;
  }

  return true;
}

function slotsShareAnyTime(slotA: CandidateSlot, slotB: CandidateSlot): boolean {
  const [smaller, larger] =
    slotA.timeKeys.size <= slotB.timeKeys.size
      ? [slotA.timeKeys, slotB.timeKeys]
      : [slotB.timeKeys, slotA.timeKeys];

  for (const key of smaller) {
    if (larger.has(key)) {
      return true;
    }
  }

  return false;
}

export function generateTimetableCandidates({
  demands,
  calendar,
  options,
  unavailability = [],
}: GenerateTimetableParams): GenerateTimetableResult {
  const startTime = Date.now();
  let statesExplored = 0;

  const maxCandidates = options?.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const getDiagnostics = (): GenerateTimetableDiagnostics => ({
    statesExplored,
    timeMs: Date.now() - startTime,
  });

  if (demands.length === 0) {
    statesExplored = 1;

    return {
      ok: true,
      candidates: [{ events: [], penaltyScore: 0 }],
      diagnostics: getDiagnostics(),
    };
  }

  // Decompose demands into schedulable layers. Demands with weekly counts > 1
  // (e.g. 24 pairs over 16 weeks has counts 2 and 1) are split into stable layers.
  const units: SchedulableDemandLayer[] = [];
  let unitIndexCounter = 0;

  for (let demandIndex = 0; demandIndex < demands.length; demandIndex += 1) {
    const demand = demands[demandIndex];
    const pairsResult = getPairsFromAcademicHours(demand.academicHours);

    if (!pairsResult.ok) {
      return { ok: false, error: 'INVALID_INPUT', diagnostics: getDiagnostics() };
    }

    const weeklyResult = getWeeklyPairCounts({
      pairs: pairsResult.pairs,
      weeks: calendar.teachingWeeks,
      parity: demand.parity,
      order: demand.order,
    });

    if (!weeklyResult.ok) {
      return { ok: false, error: 'INVALID_INPUT', diagnostics: getDiagnostics() };
    }

    const maxCount = Math.max(...weeklyResult.counts);

    for (let level = 1; level <= maxCount; level += 1) {
      const layerCounts = weeklyResult.counts.map((count): number => (count >= level ? 1 : 0));
      const layerRequiredPairs = layerCounts.reduce((sum, count): number => sum + count, 0);

      units.push({
        unitIndex: unitIndexCounter,
        demandIndex,
        demand,
        layerIndex: level - 1,
        weeklyCounts: layerCounts,
        requiredPairs: layerRequiredPairs,
      });
      unitIndexCounter += 1;
    }
  }

  const confirmedUnavailability = unavailability.filter((entry): boolean => entry.isConfirmed);
  const unitCandidateSlots: CandidateSlot[][] = [];
  let nextGlobalIndex = 0;

  for (const unit of units) {
    const { demand, weeklyCounts, requiredPairs, layerIndex, unitIndex, demandIndex } = unit;
    const weekdays = demand.isSaturdayOnly
      ? [TIMETABLE_WEEKDAY.SATURDAY]
      : [
          TIMETABLE_WEEKDAY.MONDAY,
          TIMETABLE_WEEKDAY.TUESDAY,
          TIMETABLE_WEEKDAY.WEDNESDAY,
          TIMETABLE_WEEKDAY.THURSDAY,
          TIMETABLE_WEEKDAY.FRIDAY,
        ];

    const maxPair = demand.hasLateSlotAuthorization ? LAST_PAIR : FIRST_LATE_PAIR - 1;
    const slots: CandidateSlot[] = [];

    for (const weekday of weekdays) {
      for (let pair = FIRST_PAIR; pair <= maxPair; pair += 1) {
        if (Date.now() - startTime >= timeoutMs) {
          return { ok: false, error: 'TIMEOUT', diagnostics: getDiagnostics() };
        }

        const expandResult = expandSlotOccurrences({
          weekday,
          pair,
          weeklyCounts,
          calendar,
          isSaturdayOnly: demand.isSaturdayOnly,
        });

        if (!expandResult.ok) {
          return {
            ok: false,
            error: 'INVALID_INPUT',
            diagnostics: getDiagnostics(),
          };
        }

        // Workload completeness: if a holiday excluded an occurrence and no makeup restored it,
        // this slot cannot satisfy the required pairs for this demand layer.
        if (expandResult.occurrences.length !== requiredPairs) {
          continue;
        }

        const timeKeys = new Set(
          expandResult.occurrences.map(
            (occurrence): string => `${occurrence.date}|${occurrence.pair}`,
          ),
        );

        const isUnavailable = confirmedUnavailability.some(
          (entry): boolean =>
            entry.teacherId === demand.teacherId && timeKeys.has(`${entry.date}|${entry.pair}`),
        );

        if (isUnavailable) {
          continue;
        }

        const events: ScheduledEvent[] = expandResult.occurrences.map(
          (occurrence): ScheduledEvent => ({
            id: `${demand.id}-${occurrence.date}-${occurrence.pair}`,
            teachingAssignmentId: demand.id,
            disciplineTitle: demand.disciplineTitle,
            teachingType: demand.teachingType,
            teacherId: demand.teacherId,
            groupIds: demand.groupIds,
            date: occurrence.date,
            pair: occurrence.pair,
            subgroupId: demand.subgroupId,
            streamId: demand.streamId,
            studentIds: demand.studentIds,
            hasLateSlotAuthorization: demand.hasLateSlotAuthorization,
            isSaturdayOnly: demand.isSaturdayOnly,
            isMakeupSaturday: occurrence.isMakeup,
          }),
        );

        const heuristicCost = computeSlotHeuristicCost(demand, weekday, pair);

        slots.push({
          globalIndex: nextGlobalIndex,
          demandIndex,
          unitIndex,
          layerIndex,
          weekday,
          pair,
          events,
          timeKeys,
          heuristicCost,
        });
        nextGlobalIndex += 1;
      }
    }

    if (slots.length === 0) {
      return {
        ok: false,
        error: 'NO_FEASIBLE_SOLUTION',
        diagnostics: getDiagnostics(),
      };
    }

    slots.sort((first, second): number => first.heuristicCost - second.heuristicCost);
    unitCandidateSlots.push(slots);
  }

  const totalSlots = nextGlobalIndex;
  const conflicts = new Uint8Array(totalSlots * totalSlots);

  for (let firstUnit = 0; firstUnit < units.length; firstUnit += 1) {
    const unitA = units[firstUnit];
    const slotsA = unitCandidateSlots[firstUnit];

    for (let secondUnit = firstUnit + 1; secondUnit < units.length; secondUnit += 1) {
      if (Date.now() - startTime >= timeoutMs) {
        return { ok: false, error: 'TIMEOUT', diagnostics: getDiagnostics() };
      }

      const unitB = units[secondUnit];
      const slotsB = unitCandidateSlots[secondUnit];

      const isSameDemand = unitA.demandIndex === unitB.demandIndex;
      const checkTeacher = isSameDemand || hasTeacherConflict(unitA.demand, unitB.demand);
      const checkStudent = isSameDemand || hasStudentConflict(unitA.demand, unitB.demand);

      if (!checkTeacher && !checkStudent) {
        continue;
      }

      for (const slotA of slotsA) {
        for (const slotB of slotsB) {
          if (slotsShareAnyTime(slotA, slotB)) {
            conflicts[slotA.globalIndex * totalSlots + slotB.globalIndex] = 1;
            conflicts[slotB.globalIndex * totalSlots + slotA.globalIndex] = 1;
          }
        }
      }
    }
  }

  const assigned = Array.from<CandidateSlot | null>({
    length: units.length,
  }).fill(null);
  let assignedCount = 0;
  const candidates: TimetableCandidate[] = [];
  let timedOut = false;

  function search(): void {
    statesExplored += 1;

    if (Date.now() - startTime >= timeoutMs) {
      timedOut = true;

      return;
    }

    if (assignedCount === units.length) {
      const events: ScheduledEvent[] = [];

      for (let index = 0; index < units.length; index += 1) {
        const slot = assigned[index];

        if (slot !== null) {
          for (let eventIndex = 0; eventIndex < slot.events.length; eventIndex += 1) {
            events.push(slot.events[eventIndex]);
          }
        }
      }

      // Workload completeness check:
      // Verify that total generated events for each demand matches requiredPairs (academicHours / 2).
      const isWorkloadComplete = demands.every((demand): boolean => {
        const count = events.filter(
          (event): boolean => event.teachingAssignmentId === demand.id,
        ).length;
        const requiredPairs = demand.academicHours / ACADEMIC_HOURS_PER_PAIR;

        return count === requiredPairs;
      });

      if (!isWorkloadComplete) {
        return;
      }

      const report = checkTimetableConflicts({ events, unavailability });

      if (report.isValid) {
        candidates.push({
          events,
          penaltyScore: report.totalPenaltyScore,
        });
      }

      return;
    }

    let bestUnitIndex = -1;
    let minCompatibleCount = Number.POSITIVE_INFINITY;
    let bestCompatibleSlots: CandidateSlot[] = [];

    for (let unitIndex = 0; unitIndex < units.length; unitIndex += 1) {
      if (assigned[unitIndex] !== null) {
        continue;
      }

      const allSlots = unitCandidateSlots[unitIndex];
      const compatible: CandidateSlot[] = [];

      for (let slotIndex = 0; slotIndex < allSlots.length; slotIndex += 1) {
        const slot = allSlots[slotIndex];
        let hasConflict = false;

        for (let checkIndex = 0; checkIndex < units.length; checkIndex += 1) {
          const current = assigned[checkIndex];

          if (
            current !== null &&
            conflicts[slot.globalIndex * totalSlots + current.globalIndex] === 1
          ) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          compatible.push(slot);
        }
      }

      if (compatible.length === 0) {
        return;
      }

      if (
        compatible.length < minCompatibleCount ||
        (compatible.length === minCompatibleCount &&
          units[unitIndex].demand.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE &&
          units[bestUnitIndex]?.demand.teachingType !== TIMETABLE_TEACHING_TYPE.LECTURE)
      ) {
        minCompatibleCount = compatible.length;
        bestUnitIndex = unitIndex;
        bestCompatibleSlots = compatible;
      }
    }

    if (bestUnitIndex === -1) {
      return;
    }

    for (let slotIndex = 0; slotIndex < bestCompatibleSlots.length; slotIndex += 1) {
      const slot = bestCompatibleSlots[slotIndex];

      assigned[bestUnitIndex] = slot;
      assignedCount += 1;

      search();

      assigned[bestUnitIndex] = null;
      assignedCount -= 1;

      if (candidates.length >= maxCandidates || timedOut) {
        return;
      }
    }
  }

  search();

  if (candidates.length > 0) {
    candidates.sort((first, second): number => first.penaltyScore - second.penaltyScore);

    return {
      ok: true,
      candidates: candidates.slice(0, maxCandidates),
      diagnostics: getDiagnostics(),
    };
  }

  if (timedOut) {
    return {
      ok: false,
      error: 'TIMEOUT',
      diagnostics: getDiagnostics(),
    };
  }

  return {
    ok: false,
    error: 'NO_FEASIBLE_SOLUTION',
    diagnostics: getDiagnostics(),
  };
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, String.raw`\\`)
    .replace(/\r\n|\r|\n/g, String.raw`\n`)
    .replace(/;/g, String.raw`\;`)
    .replace(/,/g, String.raw`\,`);
}

export function sanitizeIcsUrl(url: string): string {
  return url
    .replace(/\r\n|\r|\n/g, '')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);

      return code >= 32 && code !== 127;
    })
    .join('')
    .trim();
}

export function foldLine(line: string, maxOctets = 75): string {
  const encoder = new TextEncoder();

  if (encoder.encode(line).length <= maxOctets) {
    return line;
  }

  const parts: string[] = [];
  let currentChunk = '';
  let currentBytes = 0;
  let limit = maxOctets;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;

    if (currentBytes + charBytes > limit && currentChunk.length > 0) {
      parts.push(currentChunk);
      currentChunk = char;
      currentBytes = charBytes;
      limit = maxOctets - 1;
    } else {
      currentChunk += char;
      currentBytes += charBytes;
    }
  }

  if (currentChunk.length > 0) {
    parts.push(currentChunk);
  }

  return parts.join('\r\n ');
}

function formatUtcDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatLocalDateTime(date: Date, timeZone = TIMETABLE_TIME_ZONE): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );

  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
}

const TEACHING_TYPE_LABELS: Record<string, string> = {
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

const EUROPE_KYIV_VTIMEZONE = [
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

export function generateIcsCalendar(options: GenerateIcsOptions): string {
  const { events, calendarName, now = new Date() } = options;
  const dtstamp = formatUtcDateTime(now);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Karazin UniVerse//Timetable//UK',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  if (calendarName) {
    lines.push(`X-WR-CALNAME:${escapeIcsText(calendarName)}`);
    lines.push(`NAME:${escapeIcsText(calendarName)}`);
  }

  lines.push(`X-WR-TIMEZONE:${TIMETABLE_TIME_ZONE}`);
  lines.push(EUROPE_KYIV_VTIMEZONE);

  for (const event of events) {
    let dtstart = '';
    let dtend = '';

    if (event.start && event.end) {
      dtstart = formatLocalDateTime(event.start, TIMETABLE_TIME_ZONE);
      dtend = formatLocalDateTime(event.end, TIMETABLE_TIME_ZONE);
    } else if (event.start && !event.end) {
      dtstart = formatLocalDateTime(event.start, TIMETABLE_TIME_ZONE);
      dtend = formatLocalDateTime(
        new Date(event.start.getTime() + 80 * 60 * 1000),
        TIMETABLE_TIME_ZONE,
      );
    } else if (event.date && event.pair !== undefined && isPairNumber(event.pair)) {
      const pairResult = getPairInstants(event.date, event.pair);

      if (pairResult.ok) {
        dtstart = formatLocalDateTime(pairResult.start, TIMETABLE_TIME_ZONE);
        dtend = formatLocalDateTime(pairResult.end, TIMETABLE_TIME_ZONE);
      }
    }

    if (!dtstart || !dtend) {
      continue;
    }

    const rawUid = event.id.includes('@') ? event.id : `${event.id}@timetable.universe.karazin.ua`;
    const uid = escapeIcsText(rawUid);

    let summary = event.disciplineTitle;

    if (event.teachingType) {
      const typeLabel = TEACHING_TYPE_LABELS[event.teachingType] ?? event.teachingType;

      if (typeLabel && !summary.startsWith(`[${typeLabel}]`)) {
        summary = `[${typeLabel}] ${summary}`;
      }
    }

    const descriptionLines: string[] = [];

    if (event.teacherName) {
      descriptionLines.push(`Викладач: ${event.teacherName}`);
    }

    if (event.groupCodes && event.groupCodes.length > 0) {
      const label = event.groupCodes.length > 1 ? 'Групи' : 'Група';

      descriptionLines.push(`${label}: ${event.groupCodes.join(', ')}`);
    }

    const meetingUrl = event.meetingUrl ? sanitizeIcsUrl(event.meetingUrl) : undefined;

    if (meetingUrl) {
      descriptionLines.push(`Посилання: ${meetingUrl}`);
    }

    if (event.isCancelled) {
      descriptionLines.push('Статус: Скасовано');
    }

    if (event.description) {
      descriptionLines.push(event.description);
    }

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;TZID=${TIMETABLE_TIME_ZONE}:${dtstart}`);
    lines.push(`DTEND;TZID=${TIMETABLE_TIME_ZONE}:${dtend}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);

    if (descriptionLines.length > 0) {
      lines.push(`DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    }

    if (meetingUrl) {
      lines.push(`URL:${meetingUrl}`);
    }

    lines.push(event.isCancelled ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED');
    lines.push(`SEQUENCE:${event.sequence ?? 0}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return (
    lines
      .flatMap((line) => line.split('\r\n'))
      .map((line) => foldLine(line))
      .join('\r\n') + '\r\n'
  );
}
