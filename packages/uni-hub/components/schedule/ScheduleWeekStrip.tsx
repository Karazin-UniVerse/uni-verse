import React from 'react';
import { useToday } from '@uni-hub/hooks/useToday';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, getWeekDays, isSameDay } from './helpers';
import { ScheduleTypeDots } from './ScheduleTypeDots';
import styles from './ScheduleView.module.scss';

import type { ScheduleWeekStripProps } from './ScheduleView.types';

/** Monday to Saturday of the selected week, for picking a day on a phone. */
export const ScheduleWeekStrip: React.FC<ScheduleWeekStripProps> = ({
  selectedDate,
  getEventsForDate,
  onSelectDate,
  locale,
}) => {
  const { formatMessage } = useLanguage();
  const today = useToday();

  return (
    <div className={styles.weekStrip}>
      {getWeekDays(selectedDate).map((day) => {
        const events = getEventsForDate(day);

        return (
          <button
            key={day.toISOString()}
            type="button"
            aria-pressed={isSameDay(day, selectedDate)}
            aria-label={formatMessage('schedule.dayCellLabel', {
              date: formatScheduleDate(day, { weekday: 'long', day: 'numeric' }, locale),
              count: events.length,
            })}
            className={`${styles.stripDay} ${isSameDay(day, today) ? styles.stripToday : ''}`}
            onClick={() => onSelectDate(day)}
          >
            <span className={styles.stripWeekday}>
              {formatScheduleDate(day, { weekday: 'short' }, locale)}
            </span>
            <span className={styles.stripDate}>{day.getDate()}</span>
            <ScheduleTypeDots events={events} />
          </button>
        );
      })}
    </div>
  );
};
