import React from 'react';
import { useToday } from '@uni-hub/hooks/useToday';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { addDays, formatScheduleDate, getWeekDays, isSameDay } from './helpers';
import { ScheduleNav } from './ScheduleNav';
import { ScheduleWeekDayCard } from './ScheduleWeekDayCard';
import { ScheduleWeekGrid } from './ScheduleWeekGrid';
import styles from './ScheduleView.module.scss';

import type { ScheduleWeekViewProps } from './ScheduleView.types';

export const ScheduleWeekView: React.FC<ScheduleWeekViewProps> = ({
  selectedDate,
  onSelectDate,
  getEventsForDate,
  locale,
  isCompact = false,
  ...actions
}) => {
  const { formatMessage } = useLanguage();
  const today = useToday();
  const days = getWeekDays(selectedDate);
  const title = `${formatScheduleDate(days[0], { day: 'numeric', month: 'short' }, locale)} – ${formatScheduleDate(
    days.at(-1) ?? days[0],
    { day: 'numeric', month: 'short', year: 'numeric' },
    locale,
  )}`;

  return (
    <div className={styles.week}>
      <ScheduleNav
        title={title}
        prevLabel={formatMessage('schedule.prevWeek')}
        nextLabel={formatMessage('schedule.nextWeek')}
        onPrev={() => onSelectDate(addDays(selectedDate, -7))}
        onNext={() => onSelectDate(addDays(selectedDate, 7))}
        onToday={() => onSelectDate(today ?? new Date())}
      />

      {isCompact ? (
        <div className={styles.weekList}>
          {days.map((day) => (
            <ScheduleWeekDayCard
              key={day.toISOString()}
              day={day}
              events={getEventsForDate(day)}
              isToday={isSameDay(day, today)}
              locale={locale}
              {...actions}
            />
          ))}
        </div>
      ) : (
        <ScheduleWeekGrid
          days={days}
          getEventsForDate={getEventsForDate}
          locale={locale}
          {...actions}
        />
      )}
    </div>
  );
};
