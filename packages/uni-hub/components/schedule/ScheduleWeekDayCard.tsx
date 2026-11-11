import React from 'react';
import { FileEdit, Video } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, formatScheduleTime, isSafeMeetingUrl } from './helpers';
import styles from './ScheduleView.module.scss';

import type { ScheduleWeekDayCardProps } from './ScheduleView.types';

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
              {(event.meetingUrl || (isTeacher && onEditMeetingUrl)) && (
                <div className={styles.meetingRow}>
                  {event.meetingUrl &&
                    (isSafeMeetingUrl(event.meetingUrl) ? (
                      <a
                        href={event.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.meetingLink}
                      >
                        <Video size={12} /> {formatMessage('schedule.joinMeeting')}
                      </a>
                    ) : (
                      <span className={styles.meetingLink}>
                        <Video size={12} /> {formatMessage('schedule.joinMeeting')}
                      </span>
                    ))}
                  {isTeacher && onEditMeetingUrl && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => onEditMeetingUrl(event)}
                      aria-label={`${formatMessage('schedule.editMeetingUrl')}: ${event.title}`}
                    >
                      <FileEdit size={12} />
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.freeDay}>{formatMessage('schedule.freeDay')}</p>
      )}
    </div>
  );
};
