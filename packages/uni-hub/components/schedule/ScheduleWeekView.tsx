import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@una';
import { useToday } from '@uni-hub/hooks/useToday';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { addDays, formatScheduleDate, isSameDay, startOfWeek } from './helpers';
import { ScheduleWeekDayCard } from './ScheduleWeekDayCard';
import styles from './ScheduleView.module.scss';

import type { ScheduleWeekViewProps } from './ScheduleView.types';

export const ScheduleWeekView: React.FC<ScheduleWeekViewProps> = ({
  selectedDate,
  onSelectDate,
  getEventsForDate,
  locale,
  getTypeName,
}) => {
  const { formatMessage } = useLanguage();
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex)),
    [weekStart],
  );
  const today = useToday();

  return (
    <div className={styles.week}>
      <div className={styles.weekNav}>
        <Button
          type="button"
          variant="secondary"
          size="medium"
          onClick={() => onSelectDate(addDays(selectedDate, -7))}
        >
          <ChevronLeft size={16} /> {formatMessage('schedule.prevWeek')}
        </Button>
        <h3>
          {formatScheduleDate(weekStart, { day: 'numeric', month: 'short' }, locale)} –{' '}
          {formatScheduleDate(
            addDays(weekStart, 6),
            { day: 'numeric', month: 'short', year: 'numeric' },
            locale,
          )}
        </h3>
        <Button
          type="button"
          variant="secondary"
          size="medium"
          onClick={() => onSelectDate(addDays(selectedDate, 7))}
        >
          {formatMessage('schedule.nextWeek')} <ChevronRight size={16} />
        </Button>
      </div>

      <div className={styles.weekGrid}>
        {days.map((day) => (
          <ScheduleWeekDayCard
            key={day.toISOString()}
            day={day}
            events={getEventsForDate(day)}
            isToday={isSameDay(day, today)}
            locale={locale}
            getTypeName={getTypeName}
          />
        ))}
      </div>
    </div>
  );
};
