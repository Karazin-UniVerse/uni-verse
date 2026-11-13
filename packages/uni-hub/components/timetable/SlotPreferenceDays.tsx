import React, { useId, useState } from 'react';
import { PAIR_SCHEDULE, SLOT_PREFERENCE, type SlotPreference } from '@core/constants/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { findSlotPreference, getPreferenceStateKey } from './helpers';
import type { SlotPreferenceViewProps } from './TeacherSlotPreferences.types';
import styles from './TeacherSlotPreferences.module.scss';

const CHOICES: Array<SlotPreference | undefined> = [
  SLOT_PREFERENCE.PREFERRED,
  undefined,
  SLOT_PREFERENCE.UNDESIRABLE,
];

/** One day at a time with an explicit choice per pair, for phones. */
export const SlotPreferenceDays: React.FC<SlotPreferenceViewProps> = ({
  slots,
  weekdays,
  disabled,
  onChange,
}) => {
  const { formatMessage } = useLanguage();
  const baseId = useId();
  const [weekday, setWeekday] = useState(1);

  return (
    <div className={styles.days}>
      <div
        className={styles.dayTabs}
        role="tablist"
        aria-label={formatMessage('preferences.title')}
      >
        {weekdays.map((dayName, index) => (
          <button
            key={dayName}
            type="button"
            role="tab"
            id={`${baseId}-tab-${index + 1}`}
            aria-selected={weekday === index + 1}
            aria-controls={`${baseId}-panel`}
            className={styles.dayTab}
            onClick={() => setWeekday(index + 1)}
          >
            {dayName}
          </button>
        ))}
      </div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${weekday}`}
        className={styles.dayPairs}
      >
        {Object.entries(PAIR_SCHEDULE).map(([pairString, time]) => {
          const pair = Number(pairString);
          const current = findSlotPreference(slots, weekday, pair);

          return (
            <div key={pair} className={styles.dayPair}>
              <span className={styles.dayPairTime}>
                <strong>#{pair}</strong>
                <span>
                  {time.start}–{time.end}
                </span>
              </span>
              <div
                className={styles.choices}
                role="radiogroup"
                aria-label={`${weekdays[weekday - 1]}, ${pair}`}
              >
                {CHOICES.map((preference) => (
                  <button
                    key={preference ?? 'neutral'}
                    type="button"
                    role="radio"
                    aria-checked={current === preference}
                    disabled={disabled}
                    className={`${styles.choice} ${
                      preference === SLOT_PREFERENCE.PREFERRED ? styles.preferred : ''
                    } ${preference === SLOT_PREFERENCE.UNDESIRABLE ? styles.undesirable : ''}`}
                    onClick={() => onChange(weekday, pair, preference)}
                  >
                    {formatMessage(getPreferenceStateKey(preference))}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
