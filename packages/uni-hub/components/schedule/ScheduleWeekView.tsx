import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { addDays, formatScheduleDate, formatScheduleTime, isSameDay, startOfWeek } from './helpers';
import styles from './ScheduleView.module.scss';

import type { ScheduleWeekViewProps } from './ScheduleView.types';

export const ScheduleWeekView: React.FC<ScheduleWeekViewProps> = ({
  selectedDate,
  onSelectDate,
  getEventsForDate,
  locale,
  getTypeName,
}) => {
  const { formatMessage } = useLanguage();
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex)),
    [weekStart],
  );

  return (
    <div className={styles.week}>
      <div className={styles.weekNav}>
        <Button
          type="button"
          variant="secondary"
          size="medium"
          onClick={() => onSelectDate(addDays(selectedDate, -7))}
        >
          <ChevronLeft size={16} /> {formatMessage('schedule.prevWeek')}
        </Button>
        <h3>
          {formatScheduleDate(weekStart, { day: 'numeric', month: 'short' }, locale)} –{' '}
          {formatScheduleDate(
            addDays(weekStart, 6),
            { day: 'numeric', month: 'short', year: 'numeric' },
            locale,
          )}
        </h3>
        <Button
          type="button"
          variant="secondary"
          size="medium"
          onClick={() => onSelectDate(addDays(selectedDate, 7))}
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
                <span>{formatScheduleDate(day, { weekday: 'long' }, locale)}</span>
                <span>{formatScheduleDate(day, { day: '2-digit', month: '2-digit' }, locale)}</span>
              </div>
              {events.length > 0 ? (
                <ul className={styles.dayEvents}>
                  {events.map((event) => (
                    <li key={event.id}>
                      <strong>
                        {formatScheduleTime(event.start, locale)} {event.title}
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
