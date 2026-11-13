import React from 'react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, formatScheduleTime } from './helpers';
import { ScheduleEventCard } from './ScheduleEventCard';
import styles from './ScheduleView.module.scss';

import type { ScheduleEvent, ScheduleEventActions } from './ScheduleView.types';

type ScheduleDayEventsProps = ScheduleEventActions & {
  date: Date;
  events: ScheduleEvent[];
  locale: string;
};

/** The selected day's classes under the phone month calendar. */
export const ScheduleDayEvents: React.FC<ScheduleDayEventsProps> = ({
  date,
  events,
  locale,
  ...actions
}) => {
  const { formatMessage } = useLanguage();

  return (
    <section className={styles.dayEvents}>
      <div className={styles.dayEventsHead}>
        <h4>
          {formatScheduleDate(date, { weekday: 'long', day: 'numeric', month: 'long' }, locale)}
        </h4>
        <span>{formatMessage('schedule.dayEventsCount', { count: events.length })}</span>
      </div>
      {events.length === 0 ? (
        <p className={styles.freeDay}>{formatMessage('schedule.noClasses')}</p>
      ) : (
        <ul className={styles.agenda}>
          {events.map((event) => (
            <li key={event.id} className={styles.agendaRow}>
              <span className={styles.agendaTime}>
                <strong>{formatScheduleTime(event.start, locale)}</strong>
                <span>{formatScheduleTime(event.end, locale)}</span>
              </span>
              <ScheduleEventCard event={event} {...actions} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
