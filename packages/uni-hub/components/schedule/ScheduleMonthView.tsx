import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, isSameDay } from './helpers';
import { ScheduleMonthDayCell } from './ScheduleMonthDayCell';
import styles from './ScheduleView.module.scss';

import type { ScheduleMonthViewProps } from './ScheduleView.types';

export const ScheduleMonthView: React.FC<ScheduleMonthViewProps> = ({
  selectedDate,
  onSelectDate,
  onSelectDayMode,
  getEventsForDate,
  locale,
  weekdays,
  monthDays,
}) => {
  const { formatMessage } = useLanguage();
  const currentMonth = selectedDate.getMonth();

  return (
    <div className={styles.month}>
      <div className={styles.monthNav}>
        <Button
          type="button"
          variant="secondary"
          size="small"
          aria-label={formatMessage('schedule.prevMonth')}
          onClick={() =>
            onSelectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))
          }
        >
          <ChevronLeft size={16} />
        </Button>
        <h3>{formatScheduleDate(selectedDate, { month: 'long', year: 'numeric' }, locale)}</h3>
        <Button
          type="button"
          variant="secondary"
          size="small"
          aria-label={formatMessage('schedule.nextMonth')}
          onClick={() =>
            onSelectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))
          }
        >
          <ChevronRight size={16} />
        </Button>
      </div>
      <div className={styles.weekdays}>
        {weekdays.map((weekdayLabel) => (
          <div key={weekdayLabel}>{weekdayLabel}</div>
        ))}
      </div>
      <div className={styles.monthGrid}>
        {monthDays.map((day) => (
          <ScheduleMonthDayCell
            key={day.toISOString()}
            day={day}
            events={getEventsForDate(day)}
            inMonth={day.getMonth() === currentMonth}
            isToday={isSameDay(day, new Date())}
            onSelect={() => {
              onSelectDate(day);
              onSelectDayMode();
            }}
          />
        ))}
      </div>
    </div>
  );
};
