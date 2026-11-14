import {
  ACADEMIC_HOURS_PER_PAIR,
  DAYS_PER_WEEK,
  DEFAULT_ICS_FOLD_LIMIT,
  DEFAULT_MAX_CANDIDATES,
  DEFAULT_NOMINAL_WEEKS,
  DEFAULT_PAIR_DURATION_MINUTES,
  DEFAULT_TIMEOUT_MS,
  SATURDAY_ATTEMPT_TIME_SHARE,
  EUROPE_KYIV_VTIMEZONE,
  EXAM_PAIR_COUNT,
  FIRST_LATE_PAIR,
  FIRST_PAIR,
  ICS_PRODID,
  ISO_DATE_LENGTH,
  ISO_DATE_PATTERN,
  LAST_PAIR,
  LAST_PREFERRED_SATURDAY_PAIR,
  MAX_PAIRS_PER_SATURDAY,
  LATE_PAIR_PENALTY,
  MAX_PREFERRED_DAILY_PAIRS,
  MAX_STANDARD_PAIR,
  MID_STANDARD_PAIR,
  MIN_EXAM_FREE_DAYS,
  MS_PER_DAY,
  PAIR_SCHEDULE,
  PREFERRED_SLOT_HEURISTIC_BONUS,
  SATURDAY_LATE_PENALTY_MULTIPLIER,
  SLOT_PREFERENCE,
  SUNDAY,
  TEACHING_TYPE_LABELS,
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
  UNDESIRABLE_SLOT_HEURISTIC_PENALTY,
  WEEKDAY_PENALTY_MULTIPLIER,
} from '../constants/timetable.ts';
import type { PairNumber, SlotPreference } from '../constants/timetable.ts';
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
  ParticipantEntity,
  SchedulableDemandLayer,
  ScheduledEvent,
  SkippedSlotOccurrence,
  SoftPenalty,
  TeacherUnavailability,
  TeachingDemand,
  TimetableCandidate,
  TimetableDemandDeficit,
  WeeklyPairCountsParams,
  WeeklyPairCountsResult,
} from '../types/timetable.ts';

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

  // Weekly plus two extra pairs: in the first week and at the midpoint of the semester.
  if (weeks % 4 === 0 && pairs === weeks + 2) {
    const extraWeeks = new Set([0, Math.floor(weeks / 2)]);

    return {
      ok: true,
      counts: Array.from({ length: weeks }, (_, weekIndex): number =>
        extraWeeks.has(weekIndex) ? 2 : 1,
      ),
    };
  }

  return { ok: false, error: TIMETABLE_VALIDATION_ERROR.UNSUPPORTED_PATTERN };
}

/**
 * Spreads any number of pairs over the weeks as evenly as possible: every week gets the same base
 * share and the remainder goes to evenly spaced weeks. The generator falls back to it when no
 * named pattern of `getWeeklyPairCounts` fits the hours.
 */
export function getEvenWeeklyPairCounts(pairs: number, weeks: number): number[] {
  const base = Math.floor(pairs / weeks);
  const remainder = pairs - base * weeks;

  return Array.from(
    { length: weeks },
    (_, weekIndex): number =>
      base +
      Math.floor(((weekIndex + 1) * remainder) / weeks) -
      Math.floor((weekIndex * remainder) / weeks),
  );
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

/** Teaching weeks run seven days from the semester start, whatever weekday it falls on. */
export function getTeachingWeekdayMs(startMs: number, weekIndex: number, weekday: number): number {
  const daysFromStart = (weekday - new Date(startMs).getUTCDay() + DAYS_PER_WEEK) % DAYS_PER_WEEK;

  return startMs + (weekIndex * DAYS_PER_WEEK + daysFromStart) * MS_PER_DAY;
}

/** The first day after the last teaching week. */
export function getSemesterEndMs(startMs: number, teachingWeeks: number): number {
  return startMs + teachingWeeks * DAYS_PER_WEEK * MS_PER_DAY;
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
 * so a week with a zero count never yields a regular occurrence. Week `n` is the seven days from
 * `startDate + 7n`, so every weekday occurs once per week whatever day the semester starts on.
 * Excluded dates go to `skipped`. A makeup Saturday is an additional day running the
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

  const excluded = new Set(excludedMs);
  const occurrences: DatedSlotOccurrence[] = [];
  const skipped: SkippedSlotOccurrence[] = [];

  const makeupDates = new Set<number>();
  const makeups: Array<{ dateMs: number; weekIndex: number }> = [];

  for (const [index, { followsWeekday }] of makeupSaturdays.entries()) {
    const dateMs = makeupMs[index];
    const weekIndex = Math.floor((dateMs - startMs) / MS_PER_DAY / DAYS_PER_WEEK);
    const isSaturday =
      dateMs === getTeachingWeekdayMs(startMs, weekIndex, TIMETABLE_WEEKDAY.SATURDAY);
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

    if (excluded.has(dateMs)) {
      skipped.push({ date, weekIndex, pair, reason: TIMETABLE_SKIP_REASON.EXCLUDED_DATE });
    } else if (makeup) {
      occurrences.push({ date, weekIndex, pair, isMakeup: true, originalWeekday: weekday });
    } else {
      occurrences.push({ date, weekIndex, pair });
    }
  };

  for (let weekIndex = 0; weekIndex < teachingWeeks; weekIndex += 1) {
    if (weeklyCounts[weekIndex] > 0) {
      place(getTeachingWeekdayMs(startMs, weekIndex, weekday), weekIndex, false);
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
 * Explicit student sets win when both entities carry them. Otherwise students intersect through a
 * shared subgroup, shared stream, or a shared group; two different subgroups of one group never intersect.
 */
export function hasStudentIntersection(
  first: ParticipantEntity,
  second: ParticipantEntity,
): boolean {
  if (first.studentIds && second.studentIds) {
    const firstStudents = new Set(first.studentIds);

    return second.studentIds.some((studentId): boolean => firstStudents.has(studentId));
  }

  if (first.subgroupId !== undefined && second.subgroupId !== undefined) {
    return first.subgroupId === second.subgroupId;
  }

  const hasSharedGroup = first.groupIds.some((groupId): boolean =>
    second.groupIds.includes(groupId),
  );

  if (!hasSharedGroup) {
    return first.streamId !== undefined && first.streamId === second.streamId;
  }

  return true;
}

/** Two records of one event ID and stream describe a single lesson. */
function isSameStreamClass(first: ScheduledEvent, second: ScheduledEvent): boolean {
  return (
    first.id === second.id &&
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

      if (first.event.teacherId !== undefined && first.event.teacherId === second.event.teacherId) {
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
    const isExamOnSaturday = isSaturday && isExam;

    if (isSaturdayOnlyOnWeekday || isWeekdayOnlyOnSaturday || isExamOnSaturday) {
      conflicts.push({
        code: TIMETABLE_CONFLICT_CODE.SATURDAY_RESTRICTION_VIOLATION,
        message: isExamOnSaturday
          ? 'Exam cannot be scheduled on Saturday'
          : isSaturdayOnlyOnWeekday
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

function getPrecedencePenalties(
  slots: EventSlot[],
  pendingLectures: TeachingDemand[] = [],
): SoftPenalty[] {
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

    for (const groupId of groupIds) {
      if (
        pendingLectures.some(
          (demand): boolean =>
            demand.disciplineTitle === disciplineTitle && demand.groupIds.includes(groupId),
        )
      ) {
        continue;
      }

      const earliest = lectures
        .filter(
          ({ event }): boolean =>
            event.disciplineTitle === disciplineTitle && event.groupIds.includes(groupId),
        )
        .sort(compareSlots)[0];

      if (earliest && isBeforeSlot(practice, earliest)) {
        const code = TIMETABLE_SOFT_PENALTY_CODE.PRACTICE_BEFORE_LECTURE;

        penalties.push({
          code,
          score: TIMETABLE_SOFT_WEIGHT[code],
          message: `${disciplineTitle}: ${teachingType} on ${practice.event.date} precedes the first lecture`,
          eventIds: [practice.event.id, earliest.event.id],
        });
        break;
      }
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
  const participantConflicts: HardConflict[] = events
    .filter((event): boolean => {
      const hasNoParticipants =
        event.groupIds.length === 0 &&
        (!event.studentIds || event.studentIds.length === 0) &&
        !event.streamId;
      const hasSubgroupWithoutGroup = event.subgroupId !== undefined && event.groupIds.length === 0;

      return hasNoParticipants || hasSubgroupWithoutGroup;
    })
    .map((event): HardConflict => ({
      code: TIMETABLE_CONFLICT_CODE.MISSING_PARTICIPANTS,
      message: `Event ${event.id} must specify participants and parent group for subgroup`,
      eventIds: [event.id],
    }));
  const hardConflicts = [
    ...invalidConflicts,
    ...participantConflicts,
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

type SlotHeuristicParams = {
  demand: TeachingDemand;
  pair: number;
};

function computeSlotHeuristicCost({ demand, pair }: SlotHeuristicParams): number {
  if (demand.isSaturdayOnly) {
    if (pair > LAST_PREFERRED_SATURDAY_PAIR) {
      return (pair - LAST_PREFERRED_SATURDAY_PAIR) * SATURDAY_LATE_PENALTY_MULTIPLIER;
    }

    return pair;
  }

  let cost = 0;

  if (pair <= MAX_STANDARD_PAIR) {
    cost += pair;
  } else if (pair === MID_STANDARD_PAIR) {
    cost += WEEKDAY_PENALTY_MULTIPLIER;
  } else {
    cost += LATE_PAIR_PENALTY + pair;
  }

  return cost;
}

function hasTeacherConflict(first: TeachingDemand, second: TeachingDemand): boolean {
  if (first.teacherId === undefined || first.teacherId !== second.teacherId) {
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

export function generateTimetableCandidates(
  params: GenerateTimetableParams,
): GenerateTimetableResult {
  const noMissingOccurrences =
    params.calendar.excludedDates.length === 0 &&
    params.demands.every((demand): boolean => {
      const pattern = getWeeklyPairCounts({
        pairs: demand.academicHours / ACADEMIC_HOURS_PER_PAIR,
        weeks: params.options?.nominalWeeks ?? params.nominalWeeks ?? params.calendar.teachingWeeks,
        parity: demand.parity,
        order: demand.order,
      });

      return pattern.ok && pattern.counts.length <= params.calendar.teachingWeeks;
    });

  if (params.calendar.teachingWeeks >= DEFAULT_NOMINAL_WEEKS || noMissingOccurrences) {
    return generateWithPreferences(params);
  }

  const started = Date.now();
  const timeoutMs = params.options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const lastAttempt = params.calendar.teachingWeeks;
  let statesExplored = 0;
  let timedOut = false;

  for (let maxAutomaticDates = 0; maxAutomaticDates <= lastAttempt; maxAutomaticDates += 1) {
    const remainingMs = Math.max(0, timeoutMs - (Date.now() - started));
    // A tight Saturday count may be slow to settle; give it a share of the time and move on to one
    // more Saturday instead of spending the whole budget there.
    const attemptMs =
      maxAutomaticDates === lastAttempt ? remainingMs : remainingMs / SATURDAY_ATTEMPT_TIME_SHARE;
    // Short semesters are tight: undesirable slots stay a penalty instead of a hard ban.
    const result = searchTimetableCandidates(
      { ...params, options: { ...params.options, timeoutMs: attemptMs } },
      false,
      maxAutomaticDates,
    );

    statesExplored += result.diagnostics.statesExplored;
    timedOut ||= !result.ok && result.error === 'TIMEOUT';

    const isFinal =
      result.ok ||
      result.error === 'INVALID_INPUT' ||
      maxAutomaticDates === lastAttempt ||
      Date.now() - started >= timeoutMs;

    if (isFinal) {
      const diagnostics = { ...result.diagnostics, statesExplored, timeMs: Date.now() - started };

      // Without a finished search over every Saturday count, infeasibility is not proven.
      return !result.ok && timedOut
        ? { ok: false, error: 'TIMEOUT', diagnostics }
        : { ...result, diagnostics };
    }
  }

  throw new Error('Unreachable Saturday search bound');
}

function generateWithPreferences(
  params: GenerateTimetableParams,
  maxAutomaticDates = 0,
): GenerateTimetableResult {
  if (!params.preferences?.length) {
    return searchTimetableCandidates(params, false, maxAutomaticDates);
  }

  const started = Date.now();
  const timeoutMs = params.options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxCandidates = params.options?.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const strict = searchTimetableCandidates(
    { ...params, options: { ...params.options, timeoutMs: timeoutMs / 2 } },
    true,
    maxAutomaticDates,
  );

  if (!strict.ok && strict.error === 'INVALID_INPUT') {
    return strict;
  }

  if (strict.ok && strict.candidates.length >= maxCandidates) {
    return strict;
  }

  const relaxed = searchTimetableCandidates(
    {
      ...params,
      options: { ...params.options, timeoutMs: Math.max(0, timeoutMs - (Date.now() - started)) },
    },
    false,
    maxAutomaticDates,
  );
  const candidates = strict.ok ? [...strict.candidates] : [];
  const signature = (candidate: TimetableCandidate): string =>
    candidate.events
      .map((event) => `${event.teachingAssignmentId}:${event.date}:${event.pair}`)
      .sort()
      .join('|');
  const seen = new Set(candidates.map(signature));

  if (relaxed.ok) {
    for (const candidate of relaxed.candidates) {
      const key = signature(candidate);

      if (!seen.has(key)) {
        candidates.push(candidate);
        seen.add(key);
      }
    }
  }

  candidates.sort(
    (first, second) =>
      (first.preferenceViolations?.length ?? 0) - (second.preferenceViolations?.length ?? 0) ||
      first.penaltyScore - second.penaltyScore,
  );
  const diagnostics = {
    statesExplored: strict.diagnostics.statesExplored + relaxed.diagnostics.statesExplored,
    timeMs: Date.now() - started,
  };

  if (candidates.length > 0) {
    return { ok: true, candidates: candidates.slice(0, maxCandidates), diagnostics };
  }

  return { ...relaxed, diagnostics };
}

function searchTimetableCandidates(
  {
    demands,
    calendar,
    nominalWeeks: paramsNominalWeeks,
    options,
    unavailability = [],
    fixedEvents = [],
    preferences = [],
  }: GenerateTimetableParams,
  strictPreferences = false,
  maxAutomaticDates = 0,
): GenerateTimetableResult {
  const startTime = Date.now();
  let statesExplored = 0;

  const maxCandidates = options?.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const explicitNominalWeeks = options?.nominalWeeks ?? paramsNominalWeeks;

  const getDiagnostics = (deficits?: TimetableDemandDeficit[]): GenerateTimetableDiagnostics => {
    const diagnostics: GenerateTimetableDiagnostics = {
      statesExplored,
      timeMs: Date.now() - startTime,
    };

    if (deficits && deficits.length > 0) {
      diagnostics.deficits = deficits;
    }

    return diagnostics;
  };

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

    if (demand.teachingType === TIMETABLE_TEACHING_TYPE.EXAM) {
      return { ok: false, error: 'INVALID_INPUT', diagnostics: getDiagnostics() };
    }

    const hasNoParticipants =
      demand.groupIds.length === 0 &&
      (!demand.studentIds || demand.studentIds.length === 0) &&
      !demand.streamId;
    const hasSubgroupWithoutGroup = demand.subgroupId !== undefined && demand.groupIds.length === 0;

    if (hasNoParticipants || hasSubgroupWithoutGroup) {
      return { ok: false, error: 'INVALID_INPUT', diagnostics: getDiagnostics() };
    }

    const pairsResult = getPairsFromAcademicHours(demand.academicHours);

    if (!pairsResult.ok) {
      return { ok: false, error: 'INVALID_INPUT', diagnostics: getDiagnostics() };
    }

    const nativeWeeklyResult = getWeeklyPairCounts({
      pairs: pairsResult.pairs,
      weeks: explicitNominalWeeks ?? calendar.teachingWeeks,
      parity: demand.parity,
      order: demand.order,
    });
    const weeklyResult =
      nativeWeeklyResult.ok || explicitNominalWeeks !== undefined
        ? nativeWeeklyResult
        : getWeeklyPairCounts({
            pairs: pairsResult.pairs,
            weeks: DEFAULT_NOMINAL_WEEKS,
            parity: demand.parity,
            order: demand.order,
          });

    const weeklyCounts = weeklyResult.ok
      ? weeklyResult.counts
      : getEvenWeeklyPairCounts(pairsResult.pairs, explicitNominalWeeks ?? calendar.teachingWeeks);
    const maxCount = Math.max(...weeklyCounts);

    for (let level = 1; level <= maxCount; level += 1) {
      const fullLayerCounts = weeklyCounts.map((count): number => (count >= level ? 1 : 0));
      const layerRequiredPairs = fullLayerCounts.reduce((sum, count): number => sum + count, 0);
      const truncatedWeeklyCounts =
        fullLayerCounts.length >= calendar.teachingWeeks
          ? fullLayerCounts.slice(0, calendar.teachingWeeks)
          : [
              ...fullLayerCounts,
              ...Array.from(
                { length: calendar.teachingWeeks - fullLayerCounts.length },
                (): number => 0,
              ),
            ];

      units.push({
        unitIndex: unitIndexCounter,
        demandIndex,
        demand,
        layerIndex: level - 1,
        weeklyCounts: truncatedWeeklyCounts,
        requiredPairs: layerRequiredPairs,
      });
      unitIndexCounter += 1;
    }
  }

  const confirmedUnavailability = unavailability.filter((entry): boolean => entry.isConfirmed);
  const preferenceMap = new Map<string, SlotPreference>();

  for (const entry of preferences) {
    preferenceMap.set(`${entry.teacherId}|${entry.weekday}|${entry.pair}`, entry.preference);
  }

  const fixedByTimeKey = new Map<string, ScheduledEvent[]>();

  for (const fixedEvent of fixedEvents) {
    for (let offset = 0; offset < getEventSpan(fixedEvent); offset += 1) {
      const key = `${fixedEvent.date}|${fixedEvent.pair + offset}`;

      fixedByTimeKey.set(key, [...(fixedByTimeKey.get(key) ?? []), fixedEvent]);
    }
  }

  const semesterStartMs = parseIsoDate(calendar.startDate)!;
  const unitCandidateSlots: CandidateSlot[][] = [];
  const unitMaxOccurrences = new Map<number, number>();
  let nextGlobalIndex = 0;

  const calculateDeficits = (): TimetableDemandDeficit[] => {
    const deficits: TimetableDemandDeficit[] = [];

    for (let demandIdx = 0; demandIdx < demands.length; demandIdx += 1) {
      const demand = demands[demandIdx];
      const required = demand.academicHours / ACADEMIC_HOURS_PER_PAIR;
      const demandUnits = units.filter((unit): boolean => unit.demandIndex === demandIdx);
      const scheduled = demandUnits.reduce((sum, unit): number => {
        const candidateSlots = unitCandidateSlots[unit.unitIndex];

        if (candidateSlots && candidateSlots.length > 0) {
          return sum + unit.requiredPairs;
        }

        return sum + (unitMaxOccurrences.get(unit.unitIndex) ?? 0);
      }, 0);

      if (scheduled < required) {
        deficits.push({ demandId: demand.id, required, scheduled });
      }
    }

    return deficits;
  };

  for (const unit of units) {
    const { demand, weeklyCounts, requiredPairs, layerIndex, unitIndex, demandIndex } = unit;
    // Try weekdays in teaching-week order, so a week that starts midweek still tries its first
    // days first and lectures can come before the practices.
    const weekdays = demand.isSaturdayOnly
      ? [TIMETABLE_WEEKDAY.SATURDAY]
      : [
          TIMETABLE_WEEKDAY.MONDAY,
          TIMETABLE_WEEKDAY.TUESDAY,
          TIMETABLE_WEEKDAY.WEDNESDAY,
          TIMETABLE_WEEKDAY.THURSDAY,
          TIMETABLE_WEEKDAY.FRIDAY,
        ].sort(
          (first, second): number =>
            getTeachingWeekdayMs(semesterStartMs, 0, first) -
            getTeachingWeekdayMs(semesterStartMs, 0, second),
        );

    const maxPair = demand.hasLateSlotAuthorization ? LAST_PAIR : FIRST_LATE_PAIR - 1;
    const slots: CandidateSlot[] = [];

    for (const weekday of weekdays) {
      for (let pair = FIRST_PAIR; pair <= maxPair; pair += 1) {
        const preference = demand.teacherId
          ? preferenceMap.get(`${demand.teacherId}|${weekday}|${pair}`)
          : undefined;

        if (strictPreferences && preference === SLOT_PREFERENCE.UNDESIRABLE) {
          continue;
        }

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

        const currentMax = unitMaxOccurrences.get(unitIndex) ?? 0;

        if (expandResult.occurrences.length > currentMax) {
          unitMaxOccurrences.set(unitIndex, expandResult.occurrences.length);
        }

        // Workload completeness: if a holiday excluded an occurrence and no makeup restored it,
        // this slot cannot satisfy the required pairs for this demand layer.
        if (
          expandResult.occurrences.length !== requiredPairs &&
          !(
            calendar.teachingWeeks < DEFAULT_NOMINAL_WEEKS &&
            maxAutomaticDates > 0 &&
            expandResult.occurrences.length < requiredPairs
          )
        ) {
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

        const isFixedOccupied = expandResult.occurrences.some((occurrence): boolean =>
          (fixedByTimeKey.get(`${occurrence.date}|${occurrence.pair}`) ?? []).some(
            (fixedEvent): boolean =>
              (demand.teacherId !== undefined && fixedEvent.teacherId === demand.teacherId) ||
              (!(demand.streamId !== undefined && demand.streamId === fixedEvent.streamId) &&
                hasStudentIntersection(demand, fixedEvent)),
          ),
        );

        if (isFixedOccupied) {
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

        const preferenceCost =
          preference === SLOT_PREFERENCE.PREFERRED
            ? PREFERRED_SLOT_HEURISTIC_BONUS
            : preference === SLOT_PREFERENCE.UNDESIRABLE
              ? UNDESIRABLE_SLOT_HEURISTIC_PENALTY
              : 0;
        const heuristicCost =
          preferenceCost +
          computeSlotHeuristicCost({
            demand,
            pair,
          });

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
        diagnostics: getDiagnostics(calculateDeficits()),
      };
    }

    slots.sort(
      (first, second): number =>
        (preferences.length > 0 ? first.heuristicCost - second.heuristicCost : 0) ||
        (maxAutomaticDates > 0 ? second.events.length - first.events.length : 0) ||
        first.heuristicCost - second.heuristicCost,
    );
    unitCandidateSlots.push(slots);
  }

  const totalSlots = nextGlobalIndex;
  // Each clique must fit its missing occurrences into the same bounded Saturday capacity.
  // Take the minimum deficit over every regular/manual slot, never a frozen weekday choice.
  const resourceUnits = new Map<string, number[]>();

  for (const unit of units) {
    const keys = [
      ...(unit.demand.teacherId ? [`teacher:${unit.demand.teacherId}`] : []),
      ...unit.demand.groupIds.map((groupId): string => `group:${groupId}`),
    ];

    for (const key of keys) {
      const members = resourceUnits.get(key) ?? [];

      if (
        members.every((index): boolean =>
          key.startsWith('teacher:')
            ? hasTeacherConflict(unit.demand, units[index].demand) ||
              unit.demandIndex === units[index].demandIndex
            : hasStudentIntersection(unit.demand, units[index].demand),
        )
      ) {
        members.push(unit.unitIndex);
        resourceUnits.set(key, members);
      }
    }
  }

  const minimumDeficits = units.map((unit): number =>
    Math.max(
      0,
      unit.requiredPairs -
        Math.max(...unitCandidateSlots[unit.unitIndex].map((slot): number => slot.events.length)),
    ),
  );
  const capacityGroups = [...resourceUnits.values()].map((members) => {
    const pairCapacity = members.some(
      (index): boolean => units[index].demand.hasLateSlotAuthorization === true,
    )
      ? LAST_PAIR
      : FIRST_LATE_PAIR - 1;

    return {
      members,
      dateCapacities: [] as number[],
      pairCapacity,
      capacity: Math.min(pairCapacity, MAX_PAIRS_PER_SATURDAY),
    };
  });

  const weekSaturdays = Array.from({ length: calendar.teachingWeeks }, (_, week): string =>
    formatIsoDate(getTeachingWeekdayMs(semesterStartMs, week, TIMETABLE_WEEKDAY.SATURDAY)),
  );
  const saturdayDates = weekSaturdays.filter(
    (date): boolean => !calendar.excludedDates.includes(date),
  );

  for (const group of capacityGroups) {
    let maximumAvailable = 0;

    for (const date of saturdayDates) {
      const mandatory = group.members.reduce(
        (sum, index): number =>
          sum +
          Math.min(
            ...unitCandidateSlots[index].map(
              (slot): number => slot.events.filter((event): boolean => event.date === date).length,
            ),
          ),
        0,
      );

      const available = Math.max(0, group.capacity - mandatory);

      group.dateCapacities.push(available);

      maximumAvailable = Math.max(maximumAvailable, available);
    }

    group.capacity = maximumAvailable;
    group.dateCapacities.sort((first, second): number => second - first);
  }

  const firstMakeupDate = saturdayDates[0] ?? calendar.startDate;

  if (
    capacityGroups.some(
      ({ members, dateCapacities }): boolean =>
        members.reduce((sum, index): number => sum + minimumDeficits[index], 0) >
        dateCapacities
          .slice(0, maxAutomaticDates)
          .reduce((sum, capacity): number => sum + capacity, 0),
    )
  ) {
    return { ok: false, error: 'NO_FEASIBLE_SOLUTION', diagnostics: getDiagnostics() };
  }

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
      const checkStudent = isSameDemand || hasStudentIntersection(unitA.demand, unitB.demand);

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
  const fixedSlots = fixedEvents.flatMap((event): EventSlot[] => {
    const slot = toEventSlot(event);

    return slot === null ? [] : [slot];
  });

  function search(): void {
    statesExplored += 1;

    if (Date.now() - startTime >= timeoutMs) {
      timedOut = true;

      return;
    }

    if (
      capacityGroups.some(
        ({ members, dateCapacities }): boolean =>
          members.reduce((sum, index): number => {
            const slot = assigned[index];

            return (
              sum +
              (slot === null
                ? minimumDeficits[index]
                : units[index].requiredPairs - slot.events.length)
            );
          }, 0) >
          dateCapacities
            .slice(0, maxAutomaticDates)
            .reduce((sum, capacity): number => sum + capacity, 0),
      )
    ) {
      return;
    }

    const pendingLectures = units
      .filter(
        (unit): boolean =>
          (assigned[unit.unitIndex] === null ||
            ((assigned[unit.unitIndex]?.events.length ?? 0) < unit.requiredPairs &&
              !assigned[unit.unitIndex]?.events.some(
                (event): boolean => event.date < weekSaturdays[0],
              ))) &&
          unit.demand.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE,
      )
      .map((unit): TeachingDemand => unit.demand);
    const partialSlots = assigned.flatMap((candidate): EventSlot[] =>
      candidate === null
        ? []
        : candidate.events.flatMap((event): EventSlot[] => {
            const slot = toEventSlot(event);

            return slot === null ? [] : [slot];
          }),
    );

    if (getPrecedencePenalties([...fixedSlots, ...partialSlots], pendingLectures).length > 0) {
      return;
    }

    // No Saturday makeup lecture can precede a practice held before the first eligible Saturday.
    const unassignedLectures = units
      .filter(
        (unit): boolean =>
          assigned[unit.unitIndex] === null &&
          unit.demand.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE,
      )
      .map((unit): TeachingDemand => unit.demand);
    const slotsBeforeMakeups = [...fixedSlots, ...partialSlots].filter(
      ({ event }): boolean =>
        event.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE || event.date < firstMakeupDate,
    );

    if (getPrecedencePenalties(slotsBeforeMakeups, unassignedLectures).length > 0) {
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

      const automaticMakeupDates = new Set<string>();
      const missing = units.flatMap((unit): TeachingDemand[] => {
        const count = unit.requiredPairs - (assigned[unit.unitIndex]?.events.length ?? 0);

        return Array.from({ length: count }, (): TeachingDemand => unit.demand);
      });

      missing.sort(
        (first, second): number =>
          Number(second.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE) -
            Number(first.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE) ||
          second.groupIds.length - first.groupIds.length ||
          missing.filter((demand): boolean => demand.teacherId === second.teacherId).length -
            missing.filter((demand): boolean => demand.teacherId === first.teacherId).length,
      );
      function completeMissing(index: number): boolean {
        if (Date.now() - startTime >= timeoutMs) {
          timedOut = true;

          return false;
        }

        statesExplored += 1;

        if (
          getPrecedencePenalties(
            [...fixedEvents, ...events].flatMap((event): EventSlot[] => {
              const slot = toEventSlot(event);

              return slot === null ? [] : [slot];
            }),
            missing
              .slice(index)
              .filter((demand): boolean => demand.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE),
          ).length > 0
        ) {
          return false;
        }

        for (const { members, pairCapacity: capacity } of capacityGroups) {
          const remaining = missing
            .slice(index)
            .filter((demand): boolean =>
              members.some((member): boolean => units[member].demand === demand),
            ).length;

          if (remaining === 0) {
            continue;
          }

          let availableUsed = 0;
          const availableUnused: number[] = [];

          for (const date of saturdayDates) {
            const occupied = new Set<number>();

            for (const existing of [...fixedEvents, ...events]) {
              if (
                existing.date !== date ||
                !members.every((member): boolean => {
                  const demand = units[member].demand;

                  return (
                    (demand.teacherId !== undefined && demand.teacherId === existing.teacherId) ||
                    hasStudentIntersection(demand, existing)
                  );
                })
              ) {
                continue;
              }

              for (
                let pair = existing.pair;
                pair < existing.pair + getEventSpan(existing);
                pair += 1
              ) {
                if (pair <= capacity) occupied.add(pair);
              }
            }

            const available = Math.max(
              0,
              Math.min(capacity, MAX_PAIRS_PER_SATURDAY) - occupied.size,
            );

            if (automaticMakeupDates.has(date)) {
              availableUsed += available;
            } else {
              availableUnused.push(available);
            }
          }

          availableUnused.sort((first, second): number => second - first);

          if (
            remaining >
            availableUsed +
              availableUnused
                .slice(0, maxAutomaticDates - automaticMakeupDates.size)
                .reduce((sum, count): number => sum + count, 0)
          ) {
            return false;
          }
        }

        if (index === missing.length) {
          return (
            getPrecedencePenalties(
              [...fixedEvents, ...events].flatMap((event): EventSlot[] => {
                const slot = toEventSlot(event);

                return slot === null ? [] : [slot];
              }),
            ).length === 0
          );
        }

        const demand = missing[index];
        const maxPair = demand.hasLateSlotAuthorization ? LAST_PAIR : FIRST_LATE_PAIR - 1;
        const orderedPairs = Array.from(
          { length: maxPair },
          (_, index): number => index + FIRST_PAIR,
        );
        const pairCost = (pair: number): number => {
          const preference = demand.teacherId
            ? preferenceMap.get(`${demand.teacherId}|${TIMETABLE_WEEKDAY.SATURDAY}|${pair}`)
            : undefined;
          const preferenceCost =
            preference === SLOT_PREFERENCE.PREFERRED
              ? PREFERRED_SLOT_HEURISTIC_BONUS
              : preference === SLOT_PREFERENCE.UNDESIRABLE
                ? UNDESIRABLE_SLOT_HEURISTIC_PENALTY
                : 0;

          return preferenceCost + computeSlotHeuristicCost({ demand, pair });
        };

        orderedPairs.sort((first, second): number => pairCost(first) - pairCost(second));

        // Lectures take the earliest Saturdays so they can still precede the practices; other
        // classes fill the Saturdays already in use first to keep the number of extra dates low.
        const orderedDates =
          demand.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE
            ? saturdayDates
            : [...saturdayDates].sort(
                (first, second): number =>
                  Number(automaticMakeupDates.has(second)) -
                  Number(automaticMakeupDates.has(first)),
              );

        for (const date of orderedDates) {
          const alreadyUsed = automaticMakeupDates.has(date);

          if (!alreadyUsed && automaticMakeupDates.size >= maxAutomaticDates) {
            continue;
          }

          for (const [pairRank, pair] of orderedPairs.entries()) {
            const previous = index > 0 && missing[index - 1] === demand ? events.at(-1) : undefined;

            if (
              previous &&
              (date < previous.date ||
                (date === previous.date && pairRank <= orderedPairs.indexOf(previous.pair)))
            ) {
              continue;
            }

            if (
              strictPreferences &&
              demand.teacherId &&
              preferenceMap.get(`${demand.teacherId}|${TIMETABLE_WEEKDAY.SATURDAY}|${pair}`) ===
                SLOT_PREFERENCE.UNDESIRABLE
            ) {
              continue;
            }

            const event: ScheduledEvent = {
              ...demand,
              id: `${demand.id}-${date}-${pair}`,
              teachingAssignmentId: demand.id,
              date,
              pair,
              isMakeupSaturday: true,
            };

            const sameDay = [...fixedEvents, ...events].filter(
              (existing): boolean => existing.date === date,
            );
            const countPairs = (matches: (existing: ScheduledEvent) => boolean): number =>
              sameDay
                .filter(matches)
                .reduce((sum, existing): number => sum + getEventSpan(existing), 0);

            if (
              (event.teacherId !== undefined &&
                countPairs((existing): boolean => existing.teacherId === event.teacherId) >=
                  MAX_PAIRS_PER_SATURDAY) ||
              countPairs((existing): boolean => hasStudentIntersection(event, existing)) >=
                MAX_PAIRS_PER_SATURDAY
            ) {
              break;
            }

            if (
              confirmedUnavailability.some(
                (entry): boolean =>
                  entry.teacherId === event.teacherId && entry.date === date && entry.pair === pair,
              ) ||
              [...fixedEvents, ...events].some(
                (existing): boolean =>
                  existing.date === date &&
                  existing.pair <= pair &&
                  existing.pair + getEventSpan(existing) > pair &&
                  (existing.id === event.id ||
                    (event.teacherId !== undefined && existing.teacherId === event.teacherId) ||
                    hasStudentIntersection(event, existing)),
              )
            ) {
              continue;
            }

            events.push(event);
            automaticMakeupDates.add(date);

            if (completeMissing(index + 1)) {
              return true;
            }

            events.pop();

            if (!alreadyUsed) {
              automaticMakeupDates.delete(date);
            }

            if (timedOut) {
              return false;
            }
          }
        }

        return false;
      }

      if (!completeMissing(0)) {
        return;
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

      const report = checkTimetableConflicts({
        events: [...fixedEvents, ...events],
        unavailability,
      });

      const hasPracticeBeforeLecture = report.softPenalties.some(
        ({ code }): boolean => code === TIMETABLE_SOFT_PENALTY_CODE.PRACTICE_BEFORE_LECTURE,
      );

      if (report.isValid && !hasPracticeBeforeLecture) {
        const preferenceViolations = events
          .filter(
            (event) =>
              event.teacherId !== undefined &&
              preferenceMap.get(
                `${event.teacherId}|${new Date(event.date).getUTCDay()}|${event.pair}`,
              ) === SLOT_PREFERENCE.UNDESIRABLE,
          )
          .map((event) => ({
            teacherId: event.teacherId!,
            date: event.date,
            pair: event.pair,
            eventId: event.id,
          }));

        candidates.push({
          events,
          automaticMakeupDates: [...automaticMakeupDates].sort(),
          penaltyScore: report.totalPenaltyScore,
          ...(preferences.length > 0 ? { preferenceViolations } : {}),
        });
      }

      return;
    }

    let bestUnitIndex = -1;
    let minCompatibleCount = Number.POSITIVE_INFINITY;
    let bestCompatibleSlots: CandidateSlot[] = [];
    const remainingDeficits = [...minimumDeficits];

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

      remainingDeficits[unitIndex] =
        units[unitIndex].requiredPairs -
        Math.max(...compatible.map((slot): number => slot.events.length));

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

    if (
      capacityGroups.some(
        ({ members, dateCapacities }): boolean =>
          members.reduce((sum, index): number => {
            const slot = assigned[index];

            return (
              sum +
              (slot === null
                ? remainingDeficits[index]
                : units[index].requiredPairs - slot.events.length)
            );
          }, 0) >
          dateCapacities
            .slice(0, maxAutomaticDates)
            .reduce((sum, capacity): number => sum + capacity, 0),
      )
    ) {
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
    diagnostics: getDiagnostics(calculateDeficits()),
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

export function foldLine(line: string, maxOctets: number = DEFAULT_ICS_FOLD_LIMIT): string {
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

export function generateIcsCalendar(options: GenerateIcsOptions): string {
  const { events, calendarName, now = new Date() } = options;
  const dtstamp = formatUtcDateTime(now);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${ICS_PRODID}`,
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
        new Date(event.start.getTime() + DEFAULT_PAIR_DURATION_MINUTES * 60 * 1000),
        TIMETABLE_TIME_ZONE,
      );
    } else if (event.date && event.pair !== undefined && isPairNumber(event.pair)) {
      const isExam =
        event.teachingType === TIMETABLE_TEACHING_TYPE.EXAM ||
        event.teachingType === 'EXAM' ||
        event.teachingType === 'exam';
      const span = event.pairSpan ?? (isExam ? EXAM_PAIR_COUNT : 1);
      const endPair = event.pair + span - 1;

      if (isPairNumber(endPair)) {
        const startResult = getPairInstants(event.date, event.pair);
        const endResult = getPairInstants(event.date, endPair);

        if (startResult.ok && endResult.ok) {
          dtstart = formatLocalDateTime(startResult.start, TIMETABLE_TIME_ZONE);
          dtend = formatLocalDateTime(endResult.end, TIMETABLE_TIME_ZONE);
        }
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
