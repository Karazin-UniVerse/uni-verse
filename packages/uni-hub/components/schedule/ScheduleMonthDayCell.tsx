import React from 'react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, formatScheduleTime, groupDayEvents } from './helpers';
import styles from './ScheduleView.module.scss';

import type { ScheduleMonthDayCellProps } from './ScheduleView.types';

const VISIBLE_ROWS = 3;

export const ScheduleMonthDayCell: React.FC<ScheduleMonthDayCellProps> = ({
  day,
  events,
  inMonth,
  isToday,
  locale,
  getTypeName,
  onSelect,
}) => {
  const { formatMessage } = useLanguage();
  const groups = inMonth ? groupDayEvents(events) : [];
  const hiddenCount = groups.length - VISIBLE_ROWS;

  return (
    <button
      type="button"
      className={`${styles.monthCell} ${inMonth ? '' : styles.outMonth} ${isToday ? styles.today : ''}`}
      aria-label={formatMessage('schedule.dayCellLabel', {
        date: formatScheduleDate(day, { day: 'numeric', month: 'long' }, locale),
        count: inMonth ? events.length : 0,
      })}
      onClick={onSelect}
    >
      <span className={styles.monthCellHead}>
        <span className={`${styles.dateBadge} ${isToday ? styles.todayBadge : ''}`}>
          {day.getDate()}
        </span>
        {hiddenCount > 0 && (
          <span className={styles.moreEvents}>
            {formatMessage('schedule.moreEvents', { count: hiddenCount })}
          </span>
        )}
      </span>
      {groups.length > 0 && (
        <ul>
          {groups.slice(0, VISIBLE_ROWS).map((group) => (
            <li
              key={group.key}
              title={`${group.title} · ${group.types.map(getTypeName).join(', ')}`}
              className={styles[group.types[0]]}
            >
              <span className={styles.monthTime}>{formatScheduleTime(group.start, locale)}</span>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.monthEvent}>{group.title}</span>
              {group.types.length > 1 && (
                <span className={styles.monthTypes}>{group.types.map(getTypeName).join('+')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </button>
  );
};
