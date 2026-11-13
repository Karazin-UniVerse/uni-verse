import React from 'react';
import { PAIR_SCHEDULE, type PairNumber } from '@core/constants/timetable';
import { useToday } from '@uni-hub/hooks/useToday';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, getPairNumber, isSameDay } from './helpers';
import { ScheduleEventCard } from './ScheduleEventCard';
import styles from './ScheduleView.module.scss';

import type { ScheduleWeekGridProps } from './ScheduleView.types';

// Keep the morning block visible even on a light week so the grid does not collapse.
const MIN_VISIBLE_PAIRS = 4;

/** Pairs as rows and Monday to Saturday as columns. */
export const ScheduleWeekGrid: React.FC<ScheduleWeekGridProps> = ({
  days,
  getEventsForDate,
  locale,
  ...actions
}) => {
  const { formatMessage } = useLanguage();
  const today = useToday();
  const eventsByDay = days.map((day) => getEventsForDate(day));
  const lastPair = Math.max(
    MIN_VISIBLE_PAIRS,
    ...eventsByDay.flat().map((event) => getPairNumber(event.start)),
  );
  const pairs = (Object.keys(PAIR_SCHEDULE).map(Number) as PairNumber[]).filter(
    (pair) => pair <= lastPair,
  );

  return (
    <div
      className={styles.weekGrid}
      role="region"
      tabIndex={0}
      aria-label={formatMessage('schedule.modeWeek')}
    >
      <table>
        <thead>
          <tr>
            <th scope="col">{formatMessage('timetable.pairHeader')}</th>
            {days.map((day) => (
              <th
                key={day.toISOString()}
                scope="col"
                className={isSameDay(day, today) ? styles.todayColumn : undefined}
              >
                <span className={styles.weekdayName}>
                  {formatScheduleDate(day, { weekday: 'short' }, locale)}
                </span>
                <span
                  className={`${styles.dateBadge} ${isSameDay(day, today) ? styles.todayBadge : ''}`}
                >
                  {day.getDate()}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair) => (
            <tr key={pair}>
              <th scope="row" className={styles.pairCell}>
                <strong>{pair}</strong>
                <span>
                  {PAIR_SCHEDULE[pair].start}–{PAIR_SCHEDULE[pair].end}
                </span>
              </th>
              {days.map((day, index) => (
                <td
                  key={day.toISOString()}
                  className={isSameDay(day, today) ? styles.todayColumn : undefined}
                >
                  {eventsByDay[index]
                    .filter((event) => getPairNumber(event.start) === pair)
                    .map((event) => (
                      <ScheduleEventCard key={event.id} event={event} isDense {...actions} />
                    ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
