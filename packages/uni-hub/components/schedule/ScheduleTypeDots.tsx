import React from 'react';
import styles from './ScheduleView.module.scss';

import type { ScheduleEvent } from './ScheduleView.types';

type ScheduleTypeDotsProps = {
  events: ScheduleEvent[];
};

/** One dot per distinct class type of the day; decorative, the day's label carries the count. */
export const ScheduleTypeDots: React.FC<ScheduleTypeDotsProps> = ({ events }) => {
  const types = [...new Set(events.map((event) => event.type))];

  return (
    <span className={styles.dots} aria-hidden="true">
      {types.map((type) => (
        <span key={type} className={`${styles.dot} ${styles[type]}`} />
      ))}
    </span>
  );
};
