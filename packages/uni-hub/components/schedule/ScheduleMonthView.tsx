import React from 'react';
import { useToday } from '@uni-hub/hooks/useToday';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, isSameDay } from './helpers';
import { ScheduleDayEvents } from './ScheduleDayEvents';
import { ScheduleDotCalendar } from './ScheduleDotCalendar';
import { ScheduleMonthDayCell } from './ScheduleMonthDayCell';
import { ScheduleNav } from './ScheduleNav';
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
  getTypeName,
  isTeacher,
  onEditMeetingUrl,
  isCompact = false,
}) => {
  const { formatMessage } = useLanguage();
  const currentMonth = selectedDate.getMonth();
  const today = useToday();
  const shiftMonth = (offset: number): void =>
    onSelectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1));

  return (
    <div className={styles.month}>
      <ScheduleNav
        title={formatScheduleDate(selectedDate, { month: 'long', year: 'numeric' }, locale)}
        prevLabel={formatMessage('schedule.prevMonth')}
        nextLabel={formatMessage('schedule.nextMonth')}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        onToday={() => onSelectDate(today ?? new Date())}
      />

      {isCompact ? (
        <>
          <ScheduleDotCalendar
            monthDate={selectedDate}
            selectedDate={selectedDate}
            getEventsForDate={getEventsForDate}
            onSelectDate={onSelectDate}
            locale={locale}
            weekdays={weekdays}
          />
          <ScheduleDayEvents
            date={selectedDate}
            events={getEventsForDate(selectedDate)}
            locale={locale}
            getTypeName={getTypeName}
            isTeacher={isTeacher}
            onEditMeetingUrl={onEditMeetingUrl}
          />
        </>
      ) : (
        <>
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
                isToday={isSameDay(day, today)}
                locale={locale}
                getTypeName={getTypeName}
                onSelect={() => {
                  onSelectDate(day);
                  onSelectDayMode();
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
