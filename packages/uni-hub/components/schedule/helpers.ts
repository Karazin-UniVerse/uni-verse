import type { ScheduleEvent } from './ScheduleView.types';

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

export const isSameDay = (leftDate: Date, rightDate?: Date | null): boolean =>
  leftDate.getFullYear() === rightDate?.getFullYear() &&
  leftDate.getMonth() === rightDate?.getMonth() &&
  leftDate.getDate() === rightDate?.getDate();

export const KARAZIN_PAIRS = [
  { startHour: 8, startMin: 30, endHour: 9, endMin: 50, label: '1 пара (08:30 – 09:50)' },
  { startHour: 10, startMin: 10, endHour: 11, endMin: 30, label: '2 пара (10:10 – 11:30)' },
  { startHour: 12, startMin: 0, endHour: 13, endMin: 20, label: '3 пара (12:00 – 13:20)' },
  { startHour: 13, startMin: 40, endHour: 15, endMin: 0, label: '4 пара (13:40 – 15:00)' },
  { startHour: 15, startMin: 20, endHour: 16, endMin: 40, label: '5 пара (15:20 – 16:40)' },
];

export const generateDummyEvents = (): ScheduleEvent[] => {
  const events: ScheduleEvent[] = [];
  const now = new Date();
  const subjects = [
    'Паралельні та розподілені обчислення',
    'Алгоритми та структури даних',
    'Організація баз даних',
    'Архітектура компʼютерів',
    'Іноземна мова за профспрямуванням',
    'Дискретна математика',
  ];
  const locations = [
    'Ауд. 6-45 (Головний корпус)',
    'Компʼютерний клас 3-12',
    'Лабораторія ШІ та аналізу даних',
    'Дистанційно (Zoom / Meet)',
    'Ауд. 505 (ННІ КН та ШІ)',
  ];
  const types: ScheduleEvent['type'][] = ['lecture', 'lab', 'practice', 'lecture', 'lab', 'other'];

  for (let dayOffset = -15; dayOffset <= 15; dayOffset++) {
    const currentDate = addDays(now, dayOffset);

    if (currentDate.getDay() === 0) {
      continue;
    }

    const pairsCount = (Math.abs(dayOffset) % 3) + 1;

    for (let pairIndex = 0; pairIndex < pairsCount; pairIndex++) {
      const pair = KARAZIN_PAIRS[pairIndex % KARAZIN_PAIRS.length];
      const start = new Date(currentDate);

      start.setHours(pair.startHour, pair.startMin, 0, 0);
      const end = new Date(currentDate);

      end.setHours(pair.endHour, pair.endMin, 0, 0);
      const subjectIndex =
        (((dayOffset + pairIndex) % subjects.length) + subjects.length) % subjects.length;

      events.push({
        id: `evt-${dayOffset}-${pairIndex}`,
        title: subjects[subjectIndex],
        start,
        end,
        type: types[Math.abs(subjectIndex) % types.length],
        location: locations[Math.abs(subjectIndex) % locations.length],
      });
    }
  }

  const examDay = addDays(now, 5);
  const examStart = new Date(examDay);

  examStart.setHours(10, 10, 0, 0);
  const examEnd = new Date(examDay);

  examEnd.setHours(13, 20, 0, 0);

  events.push({
    id: 'evt-exam',
    title: 'Іспит: Паралельні та розподілені обчислення',
    start: examStart,
    end: examEnd,
    type: 'exam',
    location: 'Ауд. 505 (ННІ КН та ШІ)',
  });

  return events;
};

export const DUMMY_EVENTS = generateDummyEvents();

export const escapeICSText = (value: string): string =>
  value
    .replace(/\\/g, String.raw`\\`)
    .replace(/\r\n|\r|\n/g, String.raw`\n`)
    .replace(/;/g, String.raw`\;`)
    .replace(/,/g, String.raw`\,`);

export const generateICSContent = (events: ScheduleEvent[]): string => {
  const formatDateICS = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let icsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//UNiVerse//Schedule//EN\r\n';

  events.forEach((event) => {
    icsContent += 'BEGIN:VEVENT\r\n';
    icsContent += `UID:${event.id}@universemvp.tech\r\n`;
    icsContent += `DTSTAMP:${formatDateICS(new Date())}\r\n`;
    icsContent += `DTSTART:${formatDateICS(event.start)}\r\n`;
    icsContent += `DTEND:${formatDateICS(event.end)}\r\n`;
    icsContent += `SUMMARY:${escapeICSText(event.title)}\r\n`;
    icsContent += `LOCATION:${escapeICSText(event.location)}\r\n`;
    icsContent += 'END:VEVENT\r\n';
  });
  icsContent += 'END:VCALENDAR\r\n';

  return icsContent;
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

export const getTypeTone = (
  type: string,
): 'info' | 'warning' | 'success' | 'danger' | 'default' => {
  switch (type) {
    case 'lecture':
      return 'info';
    case 'lab':
      return 'warning';
    case 'practice':
      return 'success';
    case 'exam':
      return 'danger';
    default:
      return 'default';
  }
};

export const formatScheduleDate = (
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale: string,
): string => new Intl.DateTimeFormat(locale, options).format(date);

export const formatScheduleTime = (date: Date, locale: string): string =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
