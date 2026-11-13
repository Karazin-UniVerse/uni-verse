import React from 'react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './ScheduleView.module.scss';

import type { ScheduleEvent } from './ScheduleView.types';

const LEGEND_TYPES: ScheduleEvent['type'][] = ['lecture', 'practice', 'lab', 'seminar'];

type ScheduleLegendProps = {
  getTypeName: (type: string) => string;
};

export const ScheduleLegend: React.FC<ScheduleLegendProps> = ({ getTypeName }) => {
  const { formatMessage } = useLanguage();

  return (
    <ul className={styles.legend} aria-label={formatMessage('schedule.legend')}>
      {LEGEND_TYPES.map((type) => (
        <li key={type}>
          <span className={`${styles.dot} ${styles[type]}`} aria-hidden="true" />
          {getTypeName(type)}
        </li>
      ))}
    </ul>
  );
};
