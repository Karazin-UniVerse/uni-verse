import React, { useMemo, useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { SimpleButton, RadioButton } from '../design-system';
import { Tag, Empty } from './ui';
import styles from './ScheduleView.module.scss';

import type { ScheduleEvent } from './ScheduleView.types';

export type { ScheduleEvent };

const addDays = (date: Date, days: number) => {
  const d = new Date(date);

  d.setDate(d.getDate() + days);

  return d;
};

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('ru-RU', options).format(date);

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);

const generateDummyEvents = (): ScheduleEvent[] => {
  const events: ScheduleEvent[] = [];
  const now = new Date();
  const subjects = ['Математика', 'Физика', 'Программирование', 'Базы данных', 'Английский язык'];
  const locations = ['Ауд. 101', 'Ауд. 202', 'Лаборатория 3', 'Онлайн', 'Ауд. 404'];
  const types: ScheduleEvent['type'][] = ['lecture', 'practice', 'practice', 'lecture', 'other'];

  for (let i = -15; i <= 15; i++) {
    const currentDate = addDays(now, i);

    if (currentDate.getDay() === 0) continue;

    const eventsCount = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < eventsCount; j++) {
      const hour = 9 + j * 2 + Math.floor(Math.random() * 2);
      const start = new Date(currentDate);

      start.setHours(hour, 0, 0, 0);
      const end = new Date(currentDate);

      end.setHours(hour + 1, 30, 0, 0);
      const subjectIndex = (((i + j) % subjects.length) + subjects.length) % subjects.length;

      events.push({
        id: `evt-${i}-${j}`,
        title: subjects[subjectIndex],
        start,
        end,
        type: types[Math.abs(subjectIndex) % types.length],
        location: locations[Math.abs(subjectIndex) % locations.length],
      });
    }
  }

  const examDay = addDays(now, 5);

  events.push({
    id: 'evt-exam',
    title: 'Экзамен по Программированию',
    start: new Date(examDay.setHours(10, 0, 0, 0)),
    end: new Date(addDays(now, 5).setHours(14, 0, 0, 0)),
    type: 'exam',
    location: 'Ауд. 505',
  });

  return events;
};

const DUMMY_EVENTS = generateDummyEvents();

const exportToICS = (events: ScheduleEvent[]) => {
  const formatDateICS = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let icsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//UNiVerse//Schedule//EN\r\n';

  events.forEach((event) => {
    icsContent += 'BEGIN:VEVENT\r\n';
    icsContent += `UID:${event.id}@universe.com\r\n`;
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
  link.setAttribute('download', 'schedule.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getTypeName = (type: string) => {
  switch (type) {
    case 'lecture':
      return 'Лекция';
    case 'practice':
      return 'Практика';
    case 'exam':
      return 'Экзамен';
    default:
      return 'Другое';
  }
};

const getTypeTone = (type: string): 'info' | 'success' | 'danger' | 'default' => {
  switch (type) {
    case 'lecture':
      return 'info';
    case 'practice':
      return 'success';
    case 'exam':
      return 'danger';
    default:
      return 'default';
  }
};

export const ScheduleView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();

    d.setHours(0, 0, 0, 0);

    return d;
  });

  const getEventsForDate = (date: Date) =>
    DUMMY_EVENTS.filter((e) => isSameDay(e.start, date)).sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );

  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const first = new Date(year, month, 1);
    const start = startOfWeek(first);

    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const renderDayView = () => {
    const events = getEventsForDate(selectedDate);

    return (
      <section className={styles.panel}>
        <h3>
          Расписание на{' '}
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
          <Empty description="На этот день нет занятий" />
        )}
      </section>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className={styles.week}>
        <div className={styles.weekNav}>
          <SimpleButton
            type="button"
            variant="secondary"
            size="medium"
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
          >
            <ChevronLeft size={16} /> Предыдущая неделя
          </SimpleButton>
          <h3>
            {formatDate(weekStart, { day: 'numeric', month: 'short' })} –{' '}
            {formatDate(addDays(weekStart, 6), { day: 'numeric', month: 'short', year: 'numeric' })}
          </h3>
          <SimpleButton
            type="button"
            variant="secondary"
            size="medium"
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          >
            Следующая неделя <ChevronRight size={16} />
          </SimpleButton>
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
                  <p className={styles.freeDay}>Свободный день</p>
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
          <SimpleButton
            type="button"
            variant="secondary"
            size="small"
            onClick={() =>
              setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={16} />
          </SimpleButton>
          <h3>{formatDate(selectedDate, { month: 'long', year: 'numeric' })}</h3>
          <SimpleButton
            type="button"
            variant="secondary"
            size="small"
            onClick={() =>
              setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={16} />
          </SimpleButton>
        </div>
        <div className={styles.weekdays}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
            <div key={d}>{d}</div>
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
                  setViewMode('day');
                }}
              >
                <span className={styles.dayNum}>{day.getDate()}</span>
                <ul>
                  {events.slice(0, 3).map((event) => (
                    <li key={event.id}>
                      <Tag tone={getTypeTone(event.type)}>{event.title}</Tag>
                    </li>
                  ))}
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
        <div className={styles.viewSwitch} role="radiogroup" aria-label="Режим расписания">
          {(
            [
              ['month', 'Месяц'],
              ['week', 'Неделя'],
              ['day', 'День'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={styles.radioLabel}>
              <RadioButton
                variant="primary"
                name="schedule-view"
                value={value}
                checked={viewMode === value}
                onChange={() => setViewMode(value)}
              />
              {label}
            </label>
          ))}
        </div>

        <SimpleButton
          type="button"
          variant="primary"
          size="medium"
          onClick={() => exportToICS(DUMMY_EVENTS)}
        >
          <Download size={16} /> Экспорт в iCal
        </SimpleButton>
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
