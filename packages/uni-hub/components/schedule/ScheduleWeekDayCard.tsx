import React from 'react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, formatScheduleTime } from './helpers';
import styles from './ScheduleView.module.scss';

import type { ScheduleWeekDayCardProps } from './ScheduleView.types';

export const ScheduleWeekDayCard: React.FC<ScheduleWeekDayCardProps> = ({
  day,
  events,
  isToday,
  locale,
  getTypeName,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <div className={`${styles.dayCard} ${isToday ? styles.today : ''}`}>
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
};
