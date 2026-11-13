import React, { useMemo, useState } from 'react';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useMediaQuery } from '@uni-hub/hooks/useMediaQuery';
import { buildPreferenceIndex, buildPreviewSlots } from './helpers';
import { ScheduleDayAgenda } from './ScheduleDayAgenda';
import { ScheduleWeekGrid } from './ScheduleWeekGrid';
import type { ScheduleViewMode, SchedulePreviewProps } from './SchedulePreview.types';
import styles from './SchedulePreview.module.scss';

export const SchedulePreview: React.FC<SchedulePreviewProps> = ({
  events,
  academicGroups,
  onAdjust,
  teachers = [],
  slotPreferences = [],
}) => {
  const { formatMessage } = useLanguage();
  const [highlightTeacherId, setHighlightTeacherId] = useState('');
  const preferences = useMemo(() => buildPreferenceIndex(slotPreferences), [slotPreferences]);
  const teacherIds = [
    ...new Set(events.flatMap((event) => (event.teacherId ? [event.teacherId] : []))),
  ];
  const teacherChips = [
    { id: '', name: formatMessage('timetable.allTeachers') },
    ...teacherIds.map((teacherId) => ({
      id: teacherId,
      name:
        teachers.find((teacher) => teacher.id === teacherId)?.name ??
        events.find((event) => event.teacherId === teacherId)?.teacherName ??
        teacherId,
    })),
  ];
  const viewProps = { academicGroups, preferences, onAdjust, highlightTeacherId };
  const isMobile = useMediaQuery('less', BREAKPOINTS.md);
  const [chosenMode, setChosenMode] = useState<ScheduleViewMode | null>(null);
  const slots = useMemo(() => buildPreviewSlots(events), [events]);
  const mode = chosenMode ?? (isMobile ? 'day' : 'week');
  const modes: Array<{ value: ScheduleViewMode; label: string }> = [
    { value: 'week', label: formatMessage('timetable.viewWeek') },
    { value: 'day', label: formatMessage('timetable.viewDay') },
  ];

  return (
    <div className={styles.root}>
      <div
        className={styles.viewSwitch}
        role="radiogroup"
        aria-label={formatMessage('timetable.viewMode')}
      >
        {modes.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={mode === option.value}
            className={styles.viewOption}
            onClick={() => setChosenMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {teacherIds.length > 0 && (
        <div className={styles.teacherFilter}>
          <div
            className={styles.teacherChips}
            role="radiogroup"
            aria-label={formatMessage('timetable.showTeacherSlots')}
          >
            {teacherChips.map((chip) => (
              <button
                key={chip.id || 'all'}
                type="button"
                role="radio"
                aria-checked={highlightTeacherId === chip.id}
                className={styles.teacherChip}
                onClick={() => setHighlightTeacherId(chip.id)}
              >
                {chip.name}
              </button>
            ))}
          </div>
          {highlightTeacherId && (
            <ul className={styles.slotLegend}>
              <li>
                <span className={`${styles.slotSwatch} ${styles.preferred}`} aria-hidden="true" />
                {formatMessage('timetable.slotPreferred')}
              </li>
              <li>
                <span className={`${styles.slotSwatch} ${styles.undesirable}`} aria-hidden="true" />
                {formatMessage('timetable.slotUndesirable')}
              </li>
            </ul>
          )}
        </div>
      )}

      {mode === 'week' ? (
        <ScheduleWeekGrid {...viewProps} slots={slots} />
      ) : (
        <ScheduleDayAgenda {...viewProps} slots={slots} />
      )}
    </div>
  );
};
