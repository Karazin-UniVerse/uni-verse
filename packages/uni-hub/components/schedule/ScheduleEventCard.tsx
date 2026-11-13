import React from 'react';
import { FileEdit, Video } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { isSafeMeetingUrl } from './helpers';
import styles from './ScheduleView.module.scss';

import type { ScheduleEventCardProps } from './ScheduleView.types';

/** One class: type, title, who and where, plus the online link; dense cards fit a week grid cell. */
export const ScheduleEventCard: React.FC<ScheduleEventCardProps> = ({
  event,
  getTypeName,
  isTeacher,
  onEditMeetingUrl,
  isDense = false,
}) => {
  const { formatMessage } = useLanguage();
  const place = event.location || (event.meetingUrl ? formatMessage('schedule.online') : '');
  const meta = (
    isDense ? [place] : [event.teacherName, event.groupCodes?.join(', '), place]
  ).filter(Boolean);
  const joinLabel = formatMessage('schedule.joinMeeting');

  return (
    <article className={`${styles.eventCard} ${styles[event.type]} ${isDense ? styles.dense : ''}`}>
      <div className={styles.eventHead}>
        <span className={styles.typeLabel}>{getTypeName(event.type)}</span>
      </div>
      <strong className={styles.eventTitle}>{event.title}</strong>
      {meta.length > 0 && <span className={styles.eventMeta}>{meta.join(' · ')}</span>}
      {(event.meetingUrl || (isTeacher && onEditMeetingUrl)) && (
        <div className={styles.meetingRow}>
          {event.meetingUrl &&
            (isSafeMeetingUrl(event.meetingUrl) ? (
              <a
                href={event.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.meetingLink}
                aria-label={isDense ? `${joinLabel}: ${event.title}` : undefined}
              >
                <Video size={14} aria-hidden="true" /> {!isDense && joinLabel}
              </a>
            ) : (
              <span className={styles.meetingLink}>
                <Video size={14} aria-hidden="true" /> {!isDense && joinLabel}
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
              <FileEdit size={12} aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </article>
  );
};
