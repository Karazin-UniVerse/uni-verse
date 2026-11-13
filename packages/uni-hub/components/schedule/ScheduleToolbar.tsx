import React from 'react';
import { CalendarDays, Download } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './ScheduleView.module.scss';

import type { ScheduleToolbarProps } from './ScheduleView.types';

export const ScheduleToolbar: React.FC<ScheduleToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onExportICS,
  onSubscribeCalendar,
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
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={viewMode === value}
            className={styles.viewOption}
            onClick={() => onViewModeChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.toolbarButtons}>
        {onSubscribeCalendar && (
          <Button type="button" variant="secondary" onClick={onSubscribeCalendar}>
            <CalendarDays size={16} /> {formatMessage('schedule.subscribeCalendar')}
          </Button>
        )}
        <Button type="button" variant="primary" onClick={onExportICS}>
          <Download size={16} /> {formatMessage('schedule.exportICal')}
        </Button>
      </div>
    </div>
  );
};
