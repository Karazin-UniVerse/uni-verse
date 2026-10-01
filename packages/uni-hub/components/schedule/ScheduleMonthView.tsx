import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Tag } from '@una';
import { formatScheduleDate, getTypeTone, isSameDay } from './helpers';
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
  const currentMonth = selectedDate.getMonth();

  return (
    <div className={styles.month}>
      <div className={styles.monthNav}>
        <Button
          type="button"
          variant="secondary"
          size="small"
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
        {monthDays.map((day) => {
          const events = getEventsForDate(day);
          const inMonth = day.getMonth() === currentMonth;
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`${styles.monthCell} ${inMonth ? '' : styles.outMonth} ${isToday ? styles.today : ''}`}
              onClick={() => {
                onSelectDate(day);
                onSelectDayMode();
              }}
            >
              <span className={styles.dayNum}>{day.getDate()}</span>
              <ul>
                {events.slice(0, 3).map((event) => (
                  <li key={event.id}>
                    <Tag tone={getTypeTone(event.type)}>{event.title}</Tag>
                  </li>
                ))}
                {events.length > 3 && (
                  <li className={styles.moreEvents}>
                    <Tag tone="default">+{events.length - 3}</Tag>
                  </li>
                )}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
};
