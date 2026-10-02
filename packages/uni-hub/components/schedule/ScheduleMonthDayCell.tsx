import React from 'react';
import { Tag } from '@una';
import { getTypeTone } from './helpers';
import styles from './ScheduleView.module.scss';

import type { ScheduleMonthDayCellProps } from './ScheduleView.types';

export const ScheduleMonthDayCell: React.FC<ScheduleMonthDayCellProps> = ({
  day,
  events,
  inMonth,
  isToday,
  onSelect,
}) => {
  const visibleEvents = events.slice(0, 3);
  const hiddenCount = events.length - 3;

  return (
    <button
      type="button"
      className={`${styles.monthCell} ${inMonth ? '' : styles.outMonth} ${isToday ? styles.today : ''}`}
      onClick={onSelect}
    >
      <span className={styles.dayNum}>{day.getDate()}</span>
      <ul>
        {visibleEvents.map((event) => (
          <li key={event.id}>
            <Tag tone={getTypeTone(event.type)}>{event.title}</Tag>
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className={styles.moreEvents}>
            <Tag tone="default">{`+${hiddenCount}`}</Tag>
          </li>
        )}
      </ul>
    </button>
  );
};
