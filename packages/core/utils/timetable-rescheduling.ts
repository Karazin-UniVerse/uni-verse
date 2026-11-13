import {
  DAYS_PER_WEEK,
  LAST_PAIR,
  MS_PER_DAY,
  RESCHEDULE_SCOPE,
  SUNDAY,
  TIMETABLE_WEEKDAY,
} from '../constants/timetable.ts';
import type {
  BuildRescheduleChangesParams,
  BuildRescheduleChangesResult,
  RescheduleOccurrenceChange,
  ScheduledEvent,
} from '../types/timetable.ts';
import { getPairInstants } from './timetable.ts';

function sameSeries(selected: ScheduledEvent, event: ScheduledEvent): boolean {
  return (
    selected.teachingAssignmentId === event.teachingAssignmentId &&
    selected.teacherId === event.teacherId &&
    selected.teachingType === event.teachingType &&
    selected.subgroupId === event.subgroupId &&
    selected.streamId === event.streamId &&
    selected.pair === event.pair &&
    selected.pairSpan === event.pairSpan &&
    new Date(selected.date).getUTCDay() === new Date(event.date).getUTCDay() &&
    selected.groupIds.length === event.groupIds.length &&
    selected.groupIds.every((groupId) => event.groupIds.includes(groupId))
  );
}

/** Caller supplies only active occurrences from the selected published version. */
export function buildRescheduleChanges({
  eventId,
  events,
  newDate,
  newPair,
  scope,
  calendar,
  now,
}: BuildRescheduleChangesParams): BuildRescheduleChangesResult {
  const selected = events.find((event) => event.id === eventId);

  if (!selected) {
    return { ok: false, error: 'EVENT_NOT_FOUND' };
  }

  const target = getPairInstants(newDate, newPair);

  if (!target.ok) {
    return { ok: false, error: 'INVALID_TARGET' };
  }

  if (selected.date === newDate && selected.pair === newPair) {
    return { ok: false, error: 'NO_CHANGE' };
  }

  const offset = Date.parse(newDate) - Date.parse(selected.date);
  const start = Date.parse(calendar.startDate);
  const startWeekday = new Date(start).getUTCDay();
  const monday = start - ((startWeekday + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK) * MS_PER_DAY;
  const end = monday + calendar.teachingWeeks * DAYS_PER_WEEK * MS_PER_DAY;
  const series = events
    .filter(
      (event) =>
        event.id === eventId ||
        (scope === RESCHEDULE_SCOPE.SERIES &&
          event.date >= selected.date &&
          sameSeries(selected, event)),
    )
    .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
  const changes: RescheduleOccurrenceChange[] = [];

  for (const event of series) {
    const dateMs = Date.parse(event.date) + offset;
    const date = new Date(dateMs).toISOString().slice(0, 10);
    const weekday = new Date(dateMs).getUTCDay();
    const sourceInstants = getPairInstants(event.date, event.pair);
    const targetInstants = getPairInstants(date, newPair);
    const isMakeup = calendar.makeupSaturdays.some((entry) => entry.date === date);

    if (
      !sourceInstants.ok ||
      !targetInstants.ok ||
      newPair + (event.pairSpan ?? 1) - 1 > LAST_PAIR
    ) {
      return { ok: false, error: 'INVALID_TARGET' };
    }

    if (sourceInstants.start <= now || targetInstants.start <= now) {
      return { ok: false, error: 'STARTED_EVENT' };
    }

    if (
      dateMs < start ||
      dateMs >= end ||
      calendar.excludedDates.includes(date) ||
      weekday === SUNDAY ||
      (weekday === TIMETABLE_WEEKDAY.SATURDAY && !isMakeup && !event.isSaturdayOnly) ||
      (event.isSaturdayOnly && weekday !== TIMETABLE_WEEKDAY.SATURDAY)
    ) {
      return { ok: false, error: 'OUTSIDE_CALENDAR' };
    }

    changes.push({
      eventId: event.id,
      oldDate: event.date,
      oldPair: event.pair,
      newDate: date,
      newPair,
    });
  }

  return { ok: true, changes };
}
