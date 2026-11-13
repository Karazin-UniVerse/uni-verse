import React, { useId, useState } from 'react';
import { PAIR_SCHEDULE, SLOT_PREFERENCE } from '@core/constants/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import {
  countDayEvents,
  DAY_LABEL_KEYS,
  getSlotPreference,
  PREVIEW_DAYS,
  PREVIEW_PAIRS,
} from './helpers';
import { ScheduleEventCard } from './ScheduleEventCard';
import type { ScheduleViewProps } from './SchedulePreview.types';
import styles from './SchedulePreview.module.scss';

export const ScheduleDayAgenda: React.FC<ScheduleViewProps> = ({
  slots,
  academicGroups,
  preferences,
  onAdjust,
  highlightTeacherId,
}) => {
  const { formatMessage, localeTag } = useLanguage();
  const baseId = useId();
  const [chosenDay, setChosenDay] = useState<number | null>(null);
  const firstBusyDay =
    PREVIEW_DAYS.find((day) => countDayEvents(slots, day) > 0) ?? PREVIEW_DAYS[0];
  const activeDay = chosenDay ?? firstBusyDay;
  const dayPairs = PREVIEW_PAIRS.filter(
    (pair) => (slots.get(`${activeDay}-${pair}`)?.length ?? 0) > 0,
  );

  return (
    <div className={styles.agenda}>
      <div
        className={styles.dayTabs}
        role="tablist"
        aria-label={formatMessage('timetable.previewTitle')}
      >
        {PREVIEW_DAYS.map((day) => {
          const count = countDayEvents(slots, day);
          const fullName = new Intl.DateTimeFormat(localeTag, { weekday: 'long' }).format(
            new Date(2024, 0, day),
          );

          return (
            <button
              key={day}
              type="button"
              role="tab"
              id={`${baseId}-tab-${day}`}
              aria-selected={day === activeDay}
              aria-controls={`${baseId}-panel`}
              aria-label={formatMessage('timetable.dayClasses', { day: fullName, count })}
              className={styles.dayTab}
              onClick={() => setChosenDay(day)}
            >
              <span>{formatMessage(DAY_LABEL_KEYS[day - 1])}</span>
              <span className={styles.dayTabCount}>{count}</span>
            </button>
          );
        })}
      </div>

      <div
        className={styles.dayPanel}
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${activeDay}`}
      >
        {dayPairs.length === 0 && (
          <p className={styles.dayEmpty}>{formatMessage('timetable.dayEmpty')}</p>
        )}
        {dayPairs.map((pair) => {
          const schedule = PAIR_SCHEDULE[pair];

          return (
            <section key={pair} className={styles.agendaRow}>
              <div className={styles.agendaTime}>
                <strong>#{pair}</strong>
                <span>
                  {schedule.start}–{schedule.end}
                </span>
              </div>
              <div className={styles.slotStack}>
                {slots.get(`${activeDay}-${pair}`)?.map((event) => (
                  <ScheduleEventCard
                    key={event.id}
                    event={event}
                    weekday={activeDay}
                    academicGroups={academicGroups}
                    onAdjust={onAdjust}
                    isDimmed={Boolean(highlightTeacherId) && event.teacherId !== highlightTeacherId}
                    isUndesirable={
                      getSlotPreference(preferences, event.teacherId, `${activeDay}-${pair}`) ===
                      SLOT_PREFERENCE.UNDESIRABLE
                    }
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
