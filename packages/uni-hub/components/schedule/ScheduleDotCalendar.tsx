import React from 'react';
import { useToday } from '@uni-hub/hooks/useToday';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, getMonthGridDays, isSameDay } from './helpers';
import { ScheduleTypeDots } from './ScheduleTypeDots';
import styles from './ScheduleView.module.scss';

import type { ScheduleDotCalendarProps } from './ScheduleView.types';

/** Month grid with dots instead of titles: the phone month view and the day view's side calendar. */
export const ScheduleDotCalendar: React.FC<ScheduleDotCalendarProps> = ({
  monthDate,
  selectedDate,
  getEventsForDate,
  onSelectDate,
  locale,
  weekdays,
}) => {
  const { formatMessage } = useLanguage();
  const today = useToday();
  const month = monthDate.getMonth();

  return (
    <div className={styles.dotCalendar}>
      <div className={styles.dotWeekdays} aria-hidden="true">
        {weekdays.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className={styles.dotGrid}>
        {getMonthGridDays(monthDate).map((day) => {
          const events = day.getMonth() === month ? getEventsForDate(day) : [];
          const isSelected = isSameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              type="button"
              aria-pressed={isSelected}
              aria-label={formatMessage('schedule.dayCellLabel', {
                date: formatScheduleDate(day, { day: 'numeric', month: 'long' }, locale),
                count: events.length,
              })}
              className={`${styles.dotDay} ${day.getMonth() === month ? '' : styles.outMonth}`}
              onClick={() => onSelectDate(day)}
            >
              <span
                className={`${styles.dateBadge} ${isSameDay(day, today) ? styles.todayBadge : ''}`}
              >
                {day.getDate()}
              </span>
              <ScheduleTypeDots events={events} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
