import React from 'react';
import { Video } from 'lucide-react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, formatScheduleTime, isSafeMeetingUrl } from './helpers';
import styles from './ScheduleView.module.scss';

import type { ScheduleWeekDayCardProps } from './ScheduleView.types';

/** One day of the phone week list: date, count and a compact row per class. */
export const ScheduleWeekDayCard: React.FC<ScheduleWeekDayCardProps> = ({
  day,
  events,
  isToday,
  locale,
  getTypeName,
  isTeacher,
  onEditMeetingUrl,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <section className={`${styles.dayCard} ${isToday ? styles.today : ''}`}>
      <div className={styles.dayCardHeader}>
        <span className={`${styles.dateBadge} ${isToday ? styles.todayBadge : ''}`}>
          {day.getDate()}
        </span>
        <span className={styles.dayCardName}>
          {formatScheduleDate(day, { weekday: 'long' }, locale)}
        </span>
        <span className={styles.dayCardCount}>
          {formatMessage('schedule.dayEventsCount', { count: events.length })}
        </span>
      </div>
      {events.length > 0 ? (
        <ul className={styles.dayRows}>
          {events.map((event) => {
            const place =
              event.location || (event.meetingUrl ? formatMessage('schedule.online') : '');

            return (
              <li key={event.id} className={styles[event.type]}>
                <span className={styles.monthTime}>{formatScheduleTime(event.start, locale)}</span>
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.dayRowText}>
                  <span>{event.title}</span>
                  <span className={styles.eventMeta}>
                    {[getTypeName(event.type), place].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {event.meetingUrl && isSafeMeetingUrl(event.meetingUrl) && (
                  <a
                    href={event.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.meetingLink}
                    aria-label={`${formatMessage('schedule.joinMeeting')}: ${event.title}`}
                  >
                    <Video size={16} aria-hidden="true" />
                  </a>
                )}
                {isTeacher && onEditMeetingUrl && (
                  <button
                    type="button"
                    className={styles.rowAction}
                    onClick={() => onEditMeetingUrl(event)}
                  >
                    {formatMessage('schedule.editMeetingUrl')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.freeDay}>{formatMessage('schedule.freeDay')}</p>
      )}
    </section>
  );
};
