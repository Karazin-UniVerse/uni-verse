import React from 'react';
import { PAIR_SCHEDULE, SLOT_PREFERENCE } from '@core/constants/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { getSlotPreference, DAY_LABEL_KEYS, PREVIEW_DAYS, PREVIEW_PAIRS } from './helpers';
import { ScheduleEventCard } from './ScheduleEventCard';
import type { ScheduleViewProps } from './SchedulePreview.types';
import styles from './SchedulePreview.module.scss';

export const ScheduleWeekGrid: React.FC<ScheduleViewProps> = ({
  slots,
  academicGroups,
  preferences,
  onAdjust,
  highlightTeacherId,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <div
      className={styles.weekGrid}
      role="region"
      tabIndex={0}
      aria-label={formatMessage('timetable.previewTitle')}
    >
      <table>
        <thead>
          <tr>
            <th>{formatMessage('timetable.pairHeader')}</th>
            {PREVIEW_DAYS.map((day) => (
              <th key={day}>{formatMessage(DAY_LABEL_KEYS[day - 1])}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PREVIEW_PAIRS.map((pair) => {
            const schedule = PAIR_SCHEDULE[pair];

            return (
              <tr key={pair}>
                <th scope="row" className={styles.pairTimeCell}>
                  <strong>#{pair}</strong>
                  <span>
                    {schedule.start}–{schedule.end}
                  </span>
                </th>
                {PREVIEW_DAYS.map((day) => {
                  const slotKey = `${day}-${pair}`;
                  const slotEvents = slots.get(slotKey) ?? [];
                  const tone = getSlotPreference(preferences, highlightTeacherId, slotKey);

                  return (
                    <td
                      key={day}
                      className={`${styles.gridCell} ${tone ? styles[tone.toLowerCase()] : ''}`}
                    >
                      {slotEvents.length > 0 && (
                        <div className={styles.slotStack}>
                          {slotEvents.map((event) => (
                            <ScheduleEventCard
                              key={event.id}
                              event={event}
                              weekday={day}
                              academicGroups={academicGroups}
                              onAdjust={onAdjust}
                              isDimmed={
                                Boolean(highlightTeacherId) &&
                                event.teacherId !== highlightTeacherId
                              }
                              isUndesirable={
                                getSlotPreference(preferences, event.teacherId, slotKey) ===
                                SLOT_PREFERENCE.UNDESIRABLE
                              }
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
