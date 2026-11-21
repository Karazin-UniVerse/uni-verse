import { generateIcsCalendar } from '@universe/core/utils/timetable';
import {
  LAST_PAIR,
  PAIR_SCHEDULE,
  TIMETABLE_TIME_ZONE,
  type PairNumber,
} from '@universe/core/constants/timetable';
import type { IcsCalendarEvent } from '@universe/core/types/timetable';
import type { ScheduleEvent, ScheduleEventGroup } from './ScheduleView.types';

const TEACHING_DAYS_PER_WEEK = 6;
const MONTH_GRID_WEEKS = 6;
const MINUTES_PER_HOUR = 60;

export const addDays = (date: Date, days: number): Date => {
  const dateCopy = new Date(date);

  dateCopy.setDate(dateCopy.getDate() + days);

  return dateCopy;
};

export const startOfWeek = (date: Date): Date => {
  const dateCopy = new Date(date);
  const day = dateCopy.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  dateCopy.setDate(dateCopy.getDate() + diff);
  dateCopy.setHours(0, 0, 0, 0);

  return dateCopy;
};

/** Monday to Saturday of the week that contains the date. */
export const getWeekDays = (date: Date): Date[] => {
  const monday = startOfWeek(date);

  return Array.from({ length: TEACHING_DAYS_PER_WEEK }, (_, index) => addDays(monday, index));
};

/** Six Monday-to-Saturday weeks covering the month of the date. */
export const getMonthGridDays = (date: Date): Date[] => {
  const monday = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));

  return Array.from({ length: MONTH_GRID_WEEKS }, (_, week) =>
    getWeekDays(addDays(monday, week * 7)),
  ).flat();
};

const toMinutes = (clock: string): number => {
  const [hours, minutes] = clock.split(':').map(Number);

  return hours * MINUTES_PER_HOUR + minutes;
};

/** The bell-schedule pair an event belongs to: the first pair that has not ended at its start. */
export const getPairNumber = (date: Date): PairNumber => {
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMETABLE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  const minutes = toMinutes(clock);
  const pairs = Object.keys(PAIR_SCHEDULE).map(Number) as PairNumber[];

  return pairs.find((pair) => minutes < toMinutes(PAIR_SCHEDULE[pair].end)) ?? LAST_PAIR;
};

/** Collapses classes of one discipline on a day into one entry, keeping the earliest start. */
export const groupDayEvents = (events: ScheduleEvent[]): ScheduleEventGroup[] => {
  const groups = new Map<string, ScheduleEventGroup>();

  for (const event of events) {
    const group = groups.get(event.title);

    if (!group) {
      groups.set(event.title, {
        key: event.id,
        title: event.title,
        start: event.start,
        types: [event.type],
      });
      continue;
    }

    if (!group.types.includes(event.type)) {
      group.types.push(event.type);
    }

    if (event.start < group.start) {
      group.start = event.start;
    }
  }

  return [...groups.values()].sort((left, right) => left.start.getTime() - right.start.getTime());
};

const kyivDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMETABLE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function indexScheduleEvents(events: ScheduleEvent[]): Map<string, ScheduleEvent[]> {
  const byDate = new Map<string, ScheduleEvent[]>();

  for (const event of events.toSorted(
    (first, second) => first.start.getTime() - second.start.getTime(),
  )) {
    const key = kyivDateFormatter.format(event.start);
    const day = byDate.get(key);

    if (day) {
      day.push(event);
    } else {
      byDate.set(key, [event]);
    }
  }

  return byDate;
}

export const isSameDay = (leftDate: Date, rightDate?: Date | null): boolean =>
  leftDate.getFullYear() === rightDate?.getFullYear() &&
  leftDate.getMonth() === rightDate?.getMonth() &&
  leftDate.getDate() === rightDate?.getDate();

export const generateICSContent = (
  events: ScheduleEvent[],
  options?: { calendarName?: string; now?: Date },
): string => {
  const icsEvents: IcsCalendarEvent[] = events.map((event) => ({
    id: event.id,
    disciplineTitle: event.title,
    teachingType: event.type,
    start: event.start,
    end: event.end,
    location: event.location,
    meetingUrl: event.meetingUrl,
    teacherName: event.teacherName,
    groupCodes: event.groupCodes,
  }));

  return generateIcsCalendar({
    events: icsEvents,
    calendarName: options?.calendarName ?? 'Karazin UniVerse Schedule',
    now: options?.now,
  });
};

export const exportToICS = (events: ScheduleEvent[]): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const icsContent = generateICSContent(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', 'karazin-schedule.ics');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const formatScheduleDate = (
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale: string,
): string => new Intl.DateTimeFormat(locale, options).format(date);

export const formatScheduleTime = (date: Date, locale: string): string =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);

export const isSafeMeetingUrl = (url?: string | null): boolean => {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);

    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};
