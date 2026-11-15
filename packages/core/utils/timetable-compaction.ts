import {
  DEFAULT_TIMEOUT_MS,
  FIRST_PAIR,
  LAST_PAIR,
  MAX_PAIRS_PER_SATURDAY,
  TIMETABLE_SOFT_PENALTY_CODE,
  TIMETABLE_TEACHING_TYPE,
} from '../constants/timetable.ts';
import type {
  GenerateTimetableParams,
  GenerateTimetableResult,
  ScheduledEvent,
  TeacherUnavailability,
  TimetableCandidate,
} from '../types/timetable.ts';
import {
  checkTimetableConflicts,
  generateTimetableCandidates,
  getEventSpan,
  getLastAllowedPair,
  hasStudentIntersection,
} from './timetable.ts';

type CompactParams = {
  candidate: TimetableCandidate;
  fixedEvents: ScheduledEvent[];
  unavailability: TeacherUnavailability[];
  deadline: number;
};

type PlacementParams = {
  event: ScheduledEvent;
  date: string;
  pair: number;
  working: ScheduledEvent[];
  context: Pick<CompactParams, 'fixedEvents' | 'unavailability'>;
};

const sumPairs = (events: ScheduledEvent[]): number =>
  events.reduce((total, event): number => total + getEventSpan(event), 0);

const countPrecedenceViolations = (events: ScheduledEvent[]): number =>
  checkTimetableConflicts({ events }).softPenalties.filter(
    ({ code }): boolean => code === TIMETABLE_SOFT_PENALTY_CODE.PRACTICE_BEFORE_LECTURE,
  ).length;

/** The moved copy of an event if it may take this Saturday slot, otherwise null. */
function tryPlacement({
  event,
  date,
  pair,
  working,
  context,
}: PlacementParams): ScheduledEvent | null {
  const lastAllowedPair = getLastAllowedPair(event.hasLateSlotAuthorization);

  if (pair + getEventSpan(event) - 1 > lastAllowedPair) {
    return null;
  }

  const moved: ScheduledEvent = {
    ...event,
    id: `${event.teachingAssignmentId}-${date}-${pair}`,
    date,
    pair,
    isMakeupSaturday: true,
  };
  const sameDay = [...context.fixedEvents, ...working].filter(
    (existing): boolean => existing.date === date && existing.id !== event.id,
  );
  const teacherPairs =
    event.teacherId === undefined
      ? 0
      : sumPairs(sameDay.filter((existing): boolean => existing.teacherId === event.teacherId));
  const studentPairs = sumPairs(
    sameDay.filter((existing): boolean => hasStudentIntersection(event, existing)),
  );

  if (
    teacherPairs + getEventSpan(event) > MAX_PAIRS_PER_SATURDAY ||
    studentPairs + getEventSpan(event) > MAX_PAIRS_PER_SATURDAY
  ) {
    return null;
  }

  const report = checkTimetableConflicts({
    events: [...sameDay, moved],
    unavailability: context.unavailability,
  });

  return report.hardConflicts.length === 0 ? moved : null;
}

type RelocateParams = Pick<CompactParams, 'fixedEvents' | 'unavailability'> & {
  date: string;
  keptDates: string[];
  working: ScheduledEvent[];
};

/** Spreads the classes of one Saturday over the other Saturdays; null if any class does not fit. */
function relocateSaturday({
  date,
  keptDates,
  working,
  ...context
}: RelocateParams): ScheduledEvent[] | null {
  const targets = keptDates.filter((other): boolean => other !== date);
  const moving = working
    .filter((event): boolean => event.date === date && event.isMakeupSaturday === true)
    .sort(
      (first, second): number =>
        Number(second.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE) -
          Number(first.teachingType === TIMETABLE_TEACHING_TYPE.LECTURE) ||
        first.pair - second.pair,
    );
  let result = working;

  for (const event of moving) {
    let placed: ScheduledEvent | null = null;
    const loadOf = (target: string): number =>
      sumPairs(result.filter((existing): boolean => existing.date === target));
    const busiestFirst = [...targets].sort(
      (first, second): number => loadOf(second) - loadOf(first),
    );

    for (const target of busiestFirst) {
      for (let pair = FIRST_PAIR; pair <= LAST_PAIR && placed === null; pair += 1) {
        placed = tryPlacement({ event, date: target, pair, working: result, context });
      }

      if (placed !== null) {
        break;
      }
    }

    if (placed === null) {
      return null;
    }

    const movedEvent = placed;

    result = result.map((existing): ScheduledEvent => (existing === event ? movedEvent : existing));
  }

  return result;
}

/**
 * Frees extra Saturdays by moving their classes onto the remaining ones, lightest Saturday first.
 * Classes keep their teacher, participants and hours; every move passes the shared conflict
 * checks, the five-pair Saturday limit and lecture-before-practice ordering. The result never has
 * more Saturdays than the input, and the source-day mapping is dropped once days are merged.
 */
export function compactAutomaticSaturdays({
  candidate,
  fixedEvents,
  unavailability,
  deadline,
}: CompactParams): TimetableCandidate {
  const context = { fixedEvents, unavailability };
  const keptDates = [...(candidate.automaticMakeupDates ?? [])];
  const baselineViolations = countPrecedenceViolations([...fixedEvents, ...candidate.events]);
  const countMakeups = (events: ScheduledEvent[], date: string): number =>
    events.filter((event): boolean => event.date === date && event.isMakeupSaturday === true)
      .length;
  let working = candidate.events;
  const pending = [...keptDates].sort(
    (first, second): number =>
      countMakeups(working, first) - countMakeups(working, second) || second.localeCompare(first),
  );

  for (const date of pending) {
    if (Date.now() >= deadline) {
      break;
    }

    const relocated = relocateSaturday({ date, keptDates, working, ...context });

    if (
      relocated !== null &&
      countPrecedenceViolations([...fixedEvents, ...relocated]) <= baselineViolations
    ) {
      working = relocated;
      keptDates.splice(keptDates.indexOf(date), 1);
    }
  }

  if (keptDates.length === (candidate.automaticMakeupDates ?? []).length) {
    return candidate;
  }

  const report = checkTimetableConflicts({ events: [...fixedEvents, ...working], unavailability });

  return {
    ...candidate,
    events: working,
    automaticMakeupDates: keptDates.sort(),
    automaticMakeupDays: [],
    penaltyScore: report.totalPenaltyScore,
  };
}

/**
 * Generates as usual, then merges the extra Saturdays of every candidate within the same time
 * budget. Candidates with fewer extra Saturdays come first.
 */
export function generateCompactTimetableCandidates(
  params: GenerateTimetableParams,
): GenerateTimetableResult {
  const started = Date.now();
  const deadline = started + (params.options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const result = generateTimetableCandidates(params);

  if (!result.ok) {
    return result;
  }

  const candidates = result.candidates
    .map((candidate): TimetableCandidate =>
      compactAutomaticSaturdays({
        candidate,
        fixedEvents: params.fixedEvents ?? [],
        unavailability: params.unavailability ?? [],
        deadline,
      }),
    )
    .sort(
      (first, second): number =>
        (first.automaticMakeupDates?.length ?? 0) - (second.automaticMakeupDates?.length ?? 0) ||
        first.penaltyScore - second.penaltyScore,
    );

  return {
    ...result,
    candidates,
    diagnostics: { ...result.diagnostics, timeMs: Date.now() - started },
  };
}
