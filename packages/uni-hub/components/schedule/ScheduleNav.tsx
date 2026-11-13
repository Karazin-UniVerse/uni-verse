import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './ScheduleView.module.scss';

import type { ScheduleNavProps } from './ScheduleView.types';

export const ScheduleNav: React.FC<ScheduleNavProps> = ({
  title,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  onToday,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.nav}>
      <Button
        type="button"
        variant="secondary"
        size="small"
        aria-label={prevLabel}
        onClick={onPrev}
      >
        <ChevronLeft size={16} />
      </Button>
      <h3>{title}</h3>
      <Button
        type="button"
        variant="secondary"
        size="small"
        aria-label={nextLabel}
        onClick={onNext}
      >
        <ChevronRight size={16} />
      </Button>
      <Button type="button" variant="secondary" size="small" onClick={onToday}>
        {formatMessage('common.today')}
      </Button>
    </div>
  );
};
