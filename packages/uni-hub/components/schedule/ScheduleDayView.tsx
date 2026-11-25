import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Empty, Tag } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { addDays, formatScheduleDate, formatScheduleTime, getTypeTone } from './helpers';
import styles from './ScheduleView.module.scss';

import type { ScheduleDayViewProps } from './ScheduleView.types';

export const ScheduleDayView: React.FC<ScheduleDayViewProps> = ({
  selectedDate,
  onSelectDate,
  events,
  locale,
  getTypeName,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <section className={styles.panel}>
      <div className={styles.dayNav}>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => onSelectDate(addDays(selectedDate, -1))}
          aria-label={formatMessage('schedule.prevDay')}
        >
          <ChevronLeft size={16} />
        </Button>

        <h3>
          {formatMessage('schedule.scheduleFor')}{' '}
          {formatScheduleDate(
            selectedDate,
            { day: 'numeric', month: 'long', year: 'numeric' },
            locale,
          )}
        </h3>

        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => onSelectDate(addDays(selectedDate, 1))}
          aria-label={formatMessage('schedule.nextDay')}
        >
          <ChevronRight size={16} />
        </Button>
      </div>

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
