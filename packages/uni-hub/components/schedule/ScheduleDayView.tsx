import React from 'react';
import { Empty } from '@una';
import { PAIR_SCHEDULE, type PairNumber } from '@core/constants/timetable';
import { useToday } from '@uni-hub/hooks/useToday';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { addDays, formatScheduleDate, formatScheduleTime, getPairNumber } from './helpers';
import { ScheduleDotCalendar } from './ScheduleDotCalendar';
import { ScheduleEventCard } from './ScheduleEventCard';
import { ScheduleNav } from './ScheduleNav';
import { ScheduleWeekStrip } from './ScheduleWeekStrip';
import styles from './ScheduleView.module.scss';

import type { ScheduleDayViewProps } from './ScheduleView.types';

export const ScheduleDayView: React.FC<ScheduleDayViewProps> = ({
  selectedDate,
  onSelectDate,
  getEventsForDate,
  locale,
  weekdays,
  isCompact = false,
  ...actions
}) => {
  const { formatMessage } = useLanguage();
  const today = useToday();
  const events = getEventsForDate(selectedDate);
  const lastPair = Math.max(0, ...events.map((event) => getPairNumber(event.start)));
  const pairs = (Object.keys(PAIR_SCHEDULE).map(Number) as PairNumber[]).filter(
    (pair) => pair <= lastPair,
  );

  const lastEvent = events.at(-1);
  const summary = lastEvent && (
    <dl className={styles.daySummary}>
      <div>
        <dt>{formatMessage('schedule.summaryPairs')}</dt>
        <dd>{new Set(events.map((event) => getPairNumber(event.start))).size}</dd>
      </div>
      <div>
        <dt>{formatMessage('schedule.summaryHours')}</dt>
        <dd>
          {formatScheduleTime(events[0].start, locale)}–{formatScheduleTime(lastEvent.end, locale)}
        </dd>
      </div>
    </dl>
  );

  const timeline =
    events.length > 0 ? (
      <ol className={styles.timeline}>
        {pairs.map((pair) => {
          const pairEvents = events.filter((event) => getPairNumber(event.start) === pair);

          return (
            <li
              key={pair}
              className={`${styles.timelineItem} ${pairEvents.length === 0 ? styles.freeSlot : ''}`}
            >
              <span className={styles.pairCell}>
                <strong>{formatMessage('schedule.pairNumber', { pair })}</strong>
                <span>
                  {PAIR_SCHEDULE[pair].start}–{PAIR_SCHEDULE[pair].end}
                </span>
              </span>
              <div className={styles.slotEvents}>
                {pairEvents.length === 0 ? (
                  <span className={styles.freeSlotLabel}>{formatMessage('schedule.freePair')}</span>
                ) : (
                  pairEvents.map((event) => (
                    <ScheduleEventCard key={event.id} event={event} {...actions} />
                  ))
                )}
              </div>
            </li>
          );
        })}
      </ol>
    ) : (
      <Empty description={formatMessage('schedule.noClasses')} />
    );

  return (
    <section className={styles.panel}>
      <ScheduleNav
        title={`${formatMessage('schedule.scheduleFor')} ${formatScheduleDate(
          selectedDate,
          { day: 'numeric', month: 'long', year: 'numeric' },
          locale,
        )}`}
        prevLabel={formatMessage('schedule.prevDay')}
        nextLabel={formatMessage('schedule.nextDay')}
        onPrev={() => onSelectDate(addDays(selectedDate, -1))}
        onNext={() => onSelectDate(addDays(selectedDate, 1))}
        onToday={() => onSelectDate(today ?? new Date())}
      />

      {isCompact ? (
        <>
          <ScheduleWeekStrip
            selectedDate={selectedDate}
            getEventsForDate={getEventsForDate}
            onSelectDate={onSelectDate}
            locale={locale}
          />
          {summary}
          {timeline}
        </>
      ) : (
        <div className={styles.dayLayout}>
          <div className={styles.dayMain}>{timeline}</div>
          <aside className={styles.dayAside}>
            <ScheduleDotCalendar
              monthDate={selectedDate}
              selectedDate={selectedDate}
              getEventsForDate={getEventsForDate}
              onSelectDate={onSelectDate}
              locale={locale}
              weekdays={weekdays}
            />
            {summary}
          </aside>
        </div>
      )}
    </section>
  );
};
