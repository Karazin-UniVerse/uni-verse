import React from 'react';
import { PAIR_SCHEDULE, SLOT_PREFERENCE } from '@core/constants/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { findSlotPreference, getNextSlotPreference, getPreferenceStateKey } from './helpers';
import type { SlotPreferenceViewProps } from './TeacherSlotPreferences.types';
import styles from './TeacherSlotPreferences.module.scss';

/** Whole week at once: every click moves a slot to the next preference. */
export const SlotPreferenceGrid: React.FC<SlotPreferenceViewProps> = ({
  slots,
  weekdays,
  disabled,
  onChange,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <div
      className={styles.scrollContainer}
      role="region"
      aria-label={formatMessage('preferences.title')}
    >
      <table className={styles.gridTable}>
        <thead>
          <tr>
            <th className={styles.pairHeader}>{formatMessage('timetable.pairHeader')}</th>
            {weekdays.map((dayName) => (
              <th key={dayName} className={styles.dayHeader}>
                {dayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(PAIR_SCHEDULE).map(([pairString, time]) => {
            const pair = Number(pairString);

            return (
              <tr key={pair}>
                <th className={styles.pairHeader}>
                  #{pair} <br />
                  <span>{time.start}</span>
                </th>
                {weekdays.map((dayName, dayIndex) => {
                  const weekday = dayIndex + 1;
                  const preference = findSlotPreference(slots, weekday, pair);
                  const stateLabel = formatMessage(getPreferenceStateKey(preference));
                  const toneClass =
                    preference === SLOT_PREFERENCE.PREFERRED
                      ? styles.preferred
                      : preference === SLOT_PREFERENCE.UNDESIRABLE
                        ? styles.undesirable
                        : undefined;

                  return (
                    <td key={weekday} className={styles.slotCell}>
                      <button
                        type="button"
                        className={`${styles.slotButton} ${toneClass ?? ''}`}
                        disabled={disabled}
                        aria-label={`${dayName}, ${pair}: ${stateLabel}`}
                        onClick={() => onChange(weekday, pair, getNextSlotPreference(preference))}
                      >
                        <span>{stateLabel}</span>
                      </button>
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
