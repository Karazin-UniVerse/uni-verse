import React from 'react';
import { Download } from 'lucide-react';
import { Button, RadioButton } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './ScheduleView.module.scss';

import type { ScheduleToolbarProps } from './ScheduleView.types';

export const ScheduleToolbar: React.FC<ScheduleToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onExportICS,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.toolbar}>
      <div
        className={styles.viewSwitch}
        role="radiogroup"
        aria-label={formatMessage('schedule.viewModeAria')}
      >
        {(
          [
            ['month', formatMessage('schedule.modeMonth')],
            ['week', formatMessage('schedule.modeWeek')],
            ['day', formatMessage('schedule.modeDay')],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className={styles.radioLabel}>
            <RadioButton
              variant="primary"
              name="schedule-view"
              value={value}
              checked={viewMode === value}
              onChange={() => onViewModeChange(value)}
            />
            {label}
          </label>
        ))}
      </div>

      <Button type="button" variant="primary" size="medium" onClick={onExportICS}>
        <Download size={16} /> {formatMessage('schedule.exportICal')}
      </Button>
    </div>
  );
};
