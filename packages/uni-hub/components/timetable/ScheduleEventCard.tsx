import React from 'react';
import { ExternalLink, Pencil } from 'lucide-react';
import { Button, Tag } from '@una';
import type { AcademicGroupResponse } from '@core/types/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { getTargetBadges, getTeachingTypeKey, getTeachingTypeLabel } from './helpers';
import type { PreviewEvent } from './SchedulePreview.types';
import styles from './SchedulePreview.module.scss';

type ScheduleEventCardProps = {
  event: PreviewEvent;
  weekday: number;
  academicGroups: AcademicGroupResponse[];
  onAdjust?: (event: PreviewEvent, weekday: number) => void;
  isDimmed?: boolean;
  isUndesirable?: boolean;
};

export const ScheduleEventCard: React.FC<ScheduleEventCardProps> = ({
  event,
  weekday,
  academicGroups,
  onAdjust,
  isDimmed = false,
  isUndesirable = false,
}) => {
  const { formatMessage } = useLanguage();
  const typeKey = getTeachingTypeKey(event.teachingType);
  const targetBadges = getTargetBadges(event, academicGroups, formatMessage);

  return (
    <article
      className={`${styles.eventCard} ${styles[typeKey]} ${isDimmed ? styles.dimmed : ''} ${
        isUndesirable ? styles.undesirable : ''
      }`}
    >
      <header className={styles.eventHeader}>
        <span className={styles.typeLabel}>
          {getTeachingTypeLabel(event.teachingType, formatMessage)}
        </span>
        {onAdjust && (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => onAdjust(event, weekday)}
            aria-label={formatMessage('timetable.adjustSlot')}
          >
            <Pencil size={14} />
          </Button>
        )}
      </header>
      <h5 className={styles.eventTitle}>{event.disciplineTitle}</h5>
      {isUndesirable && (
        <span className={styles.warning}>{formatMessage('timetable.slotUndesirableWarning')}</span>
      )}
      {(targetBadges.length > 0 || event.isSaturdayOnly) && (
        <div className={styles.eventBadges}>
          {targetBadges.map((badge) => (
            <Tag key={badge} size="small" tone="neutral">
              {badge}
            </Tag>
          ))}
          {event.isSaturdayOnly && (
            <Tag size="small" tone="warning">
              {formatMessage('timetable.saturdayOnly')}
            </Tag>
          )}
        </div>
      )}
      <div className={styles.eventMeta}>{event.teacherName || event.teacherId}</div>
      {event.meetingUrl && (
        <a
          href={event.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.onlineLink}
        >
          <ExternalLink size={12} /> {formatMessage('timetable.onlineLink')}
        </a>
      )}
    </article>
  );
};
