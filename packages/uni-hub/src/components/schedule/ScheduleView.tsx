import React, { useMemo, useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, RadioButton, Tag, Empty } from '@una';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import styles from './ScheduleView.module.scss';

import type { ScheduleEvent } from './ScheduleView.types';

export type { ScheduleEvent };

const addDays = (date: Date, days: number) => {
  const dateCopy = new Date(date);

  dateCopy.setDate(dateCopy.getDate() + days);

  return dateCopy;
};

const startOfWeek = (date: Date) => {
  const dateCopy = new Date(date);
  const day = dateCopy.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  dateCopy.setDate(dateCopy.getDate() + diff);
  dateCopy.setHours(0, 0, 0, 0);

  return dateCopy;
};

const isSameDay = (leftDate: Date, rightDate: Date) =>
  leftDate.getFullYear() === rightDate.getFullYear() &&
  leftDate.getMonth() === rightDate.getMonth() &&
  leftDate.getDate() === rightDate.getDate();

const KARAZIN_PAIRS = [
  { startHour: 8, startMin: 30, endHour: 10, endMin: 5, label: '1 пара (08:30 – 10:05)' },
  { startHour: 10, startMin: 20, endHour: 11, endMin: 55, label: '2 пара (10:20 – 11:55)' },
  { startHour: 12, startMin: 10, endHour: 13, endMin: 45, label: '3 пара (12:10 – 13:45)' },
  { startHour: 14, startMin: 0, endHour: 15, endMin: 35, label: '4 пара (14:00 – 15:35)' },
  { startHour: 15, startMin: 50, endHour: 17, endMin: 25, label: '5 пара (15:50 – 17:25)' },
];

const generateDummyEvents = (): ScheduleEvent[] => {
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

  examStart.setHours(10, 20, 0, 0);
  const examEnd = new Date(examDay);

  examEnd.setHours(13, 45, 0, 0);

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

const DUMMY_EVENTS = generateDummyEvents();

const exportToICS = (events: ScheduleEvent[]) => {
  const formatDateICS = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let icsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//UNiVerse//Schedule//EN\r\n';

  events.forEach((event) => {
    icsContent += 'BEGIN:VEVENT\r\n';
    icsContent += `UID:${event.id}@universemvp.tech\r\n`;
    icsContent += `DTSTAMP:${formatDateICS(new Date())}\r\n`;
    icsContent += `DTSTART:${formatDateICS(event.start)}\r\n`;
    icsContent += `DTEND:${formatDateICS(event.end)}\r\n`;
    icsContent += `SUMMARY:${event.title}\r\n`;
    icsContent += `LOCATION:${event.location}\r\n`;
    icsContent += 'END:VEVENT\r\n';
  });
  icsContent += 'END:VCALENDAR\r\n';

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

const getTypeTone = (type: string): 'info' | 'warning' | 'success' | 'danger' | 'default' => {
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

export const ScheduleView: React.FC = () => {
  const isMobile = useMediaQuery('less', BREAKPOINTS.md);
  const { language, formatMessage } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'uk-UA';

  const [selectedViewMode, setSelectedViewMode] = useState<'month' | 'week' | 'day' | null>(null);
  const viewMode = selectedViewMode ?? (isMobile ? 'day' : 'month');

  const [selectedDate, setSelectedDate] = useState(() => {
    const initialDate = new Date();

    initialDate.setHours(0, 0, 0, 0);

    return initialDate;
  });

  const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options).format(date);

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);

  const getTypeName = (type: string) => {
    switch (type) {
      case 'lecture':
        return formatMessage('schedule.typeLecture');
      case 'lab':
        return formatMessage('schedule.typeLab');
      case 'practice':
        return formatMessage('schedule.typePractice');
      case 'exam':
        return formatMessage('schedule.typeExam');
      default:
        return formatMessage('schedule.typeOther');
    }
  };

  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1);

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(monday, index);
      const raw = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);

      return raw.charAt(0).toUpperCase() + raw.slice(1);
    });
  }, [locale]);

  const getEventsForDate = (date: Date) =>
    DUMMY_EVENTS.filter((event) => isSameDay(event.start, date)).sort(
      (firstEvent, secondEvent) => firstEvent.start.getTime() - secondEvent.start.getTime(),
    );

  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const first = new Date(year, month, 1);
    const start = startOfWeek(first);

    return Array.from({ length: 42 }, (_, dayIndex) => addDays(start, dayIndex));
  }, [selectedDate]);

  const renderDayView = () => {
    const events = getEventsForDate(selectedDate);

    return (
      <section className={styles.panel}>
        <h3>
          {formatMessage('schedule.scheduleFor')}{' '}
          {formatDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>
        {events.length > 0 ? (
          <ul className={styles.timeline}>
            {events.map((event) => (
              <li key={event.id} className={styles.timelineItem}>
                <div className={styles.time}>
                  {formatTime(event.start)} – {formatTime(event.end)}
                </div>
                <div className={styles.eventTitle}>{event.title}</div>
                <div className={styles.meta}>
                  <Tag tone={getTypeTone(event.type)}>{getTypeName(event.type)}</Tag>
                  <span>{event.location}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty description={formatMessage('schedule.noClasses')} />
        )}
      </section>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate);
    const days = Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex));

    return (
      <div className={styles.week}>
        <div className={styles.weekNav}>
          <Button
            type="button"
            variant="secondary"
            size="medium"
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
          >
            <ChevronLeft size={16} /> {formatMessage('schedule.prevWeek')}
          </Button>
          <h3>
            {formatDate(weekStart, { day: 'numeric', month: 'short' })} –{' '}
            {formatDate(addDays(weekStart, 6), { day: 'numeric', month: 'short', year: 'numeric' })}
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="medium"
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          >
            {formatMessage('schedule.nextWeek')} <ChevronRight size={16} />
          </Button>
        </div>

        <div className={styles.weekGrid}>
          {days.map((day) => {
            const events = getEventsForDate(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`${styles.dayCard} ${isToday ? styles.today : ''}`}
              >
                <div className={styles.dayCardHeader}>
                  <span>{formatDate(day, { weekday: 'long' })}</span>
                  <span>{formatDate(day, { day: '2-digit', month: '2-digit' })}</span>
                </div>
                {events.length > 0 ? (
                  <ul className={styles.dayEvents}>
                    {events.map((event) => (
                      <li key={event.id}>
                        <strong>
                          {formatTime(event.start)} {event.title}
                        </strong>
                        <span>
                          {getTypeName(event.type)} • {event.location}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.freeDay}>{formatMessage('schedule.freeDay')}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const currentMonth = selectedDate.getMonth();

    return (
      <div className={styles.month}>
        <div className={styles.monthNav}>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() =>
              setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={16} />
          </Button>
          <h3>{formatDate(selectedDate, { month: 'long', year: 'numeric' })}</h3>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() =>
              setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className={styles.weekdays}>
          {weekdays.map((weekdayLabel) => (
            <div key={weekdayLabel}>{weekdayLabel}</div>
          ))}
        </div>
        <div className={styles.monthGrid}>
          {monthDays.map((day) => {
            const events = getEventsForDate(day);
            const inMonth = day.getMonth() === currentMonth;
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toISOString()}
                type="button"
                className={`${styles.monthCell} ${inMonth ? '' : styles.outMonth} ${isToday ? styles.today : ''}`}
                onClick={() => {
                  setSelectedDate(day);
                  setSelectedViewMode('day');
                }}
              >
                <span className={styles.dayNum}>{day.getDate()}</span>
                <ul>
                  {events.slice(0, 3).map((event) => (
                    <li key={event.id}>
                      <Tag tone={getTypeTone(event.type)}>{event.title}</Tag>
                    </li>
                  ))}
                  {events.length > 3 && (
                    <li className={styles.moreEvents}>
                      <Tag tone="default">+{events.length - 3}</Tag>
                    </li>
                  )}
                </ul>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div
          className={styles.viewSwitch}
          role="radiogroup"
          aria-label={formatMessage('schedule.viewModeAria')}
        >
          {(
            [
              ['month', formatMessage('schedule.modeMonth')],
              ['week', formatMessage('schedule.modeWeek')],
              ['day', formatMessage('schedule.modeDay')],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={styles.radioLabel}>
              <RadioButton
                variant="primary"
                name="schedule-view"
                value={value}
                checked={viewMode === value}
                onChange={() => setSelectedViewMode(value)}
              />
              {label}
            </label>
          ))}
        </div>

        <Button
          type="button"
          variant="primary"
          size="medium"
          onClick={() => exportToICS(DUMMY_EVENTS)}
        >
          <Download size={16} /> {formatMessage('schedule.exportICal')}
        </Button>
      </div>

      <div className={styles.body}>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>
    </div>
  );
};

export default ScheduleView;
