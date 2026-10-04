import React from 'react';
import { Empty, Tag } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, formatScheduleTime, getTypeTone } from './helpers';
import styles from './ScheduleView.module.scss';

import type { ScheduleDayViewProps } from './ScheduleView.types';

export const ScheduleDayView: React.FC<ScheduleDayViewProps> = ({
  selectedDate,
  events,
  locale,
  getTypeName,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <section className={styles.panel}>
      <h3>
        {formatMessage('schedule.scheduleFor')}{' '}
        {formatScheduleDate(
          selectedDate,
          { day: 'numeric', month: 'long', year: 'numeric' },
          locale,
        )}
      </h3>
      {events.length > 0 ? (
        <ul className={styles.timeline}>
          {events.map((event) => (
            <li key={event.id} className={styles.timelineItem}>
              <div className={styles.time}>
                {formatScheduleTime(event.start, locale)} – {formatScheduleTime(event.end, locale)}
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
