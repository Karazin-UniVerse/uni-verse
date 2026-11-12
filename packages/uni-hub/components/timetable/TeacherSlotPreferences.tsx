'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PAIR_SCHEDULE,
  SLOT_PREFERENCE,
  TEACHING_DAYS_PER_WEEK,
  type SlotPreference,
} from '@core/constants/timetable';
import type { SlotPreferenceItem } from '@core/types/timetable';
import { Button, useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import {
  mySlotPreferencesQueryOptions,
  preferenceSemestersQueryOptions,
  slotPreferenceKeys,
} from './slotPreferencesQueries';
import styles from './TeacherSlotPreferences.module.scss';

const REFERENCE_MONDAY_YEAR = 2024;

function getNextPreference(current?: SlotPreference): SlotPreference | undefined {
  if (current === undefined) {
    return SLOT_PREFERENCE.PREFERRED;
  }

  if (current === SLOT_PREFERENCE.PREFERRED) {
    return SLOT_PREFERENCE.UNDESIRABLE;
  }

  return undefined;
}

function toggleSlotPreference(
  currentSlots: SlotPreferenceItem[],
  weekday: number,
  pair: number,
): SlotPreferenceItem[] {
  const existing = currentSlots.find((slot) => slot.weekday === weekday && slot.pair === pair);
  const nextPreference = getNextPreference(existing?.preference);
  const remaining = currentSlots.filter((slot) => slot.weekday !== weekday || slot.pair !== pair);

  if (!nextPreference) {
    return remaining;
  }

  return [...remaining, { weekday, pair, preference: nextPreference }];
}

function getPreferenceStateKey(
  preference?: SlotPreference,
): 'preferences.preferred' | 'preferences.undesirable' | 'preferences.neutral' {
  if (preference === SLOT_PREFERENCE.PREFERRED) {
    return 'preferences.preferred';
  }

  if (preference === SLOT_PREFERENCE.UNDESIRABLE) {
    return 'preferences.undesirable';
  }

  return 'preferences.neutral';
}

export function TeacherSlotPreferences(): React.JSX.Element {
  const { formatMessage, localeTag } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [draftSlots, setDraftSlots] = useState<SlotPreferenceItem[] | null>(null);

  const semestersQuery = useQuery(preferenceSemestersQueryOptions());
  const semesters = semestersQuery.data ?? [];
  const activeSemesterId = selectedSemesterId || semesters[0]?.id || '';
  const preferencesQuery = useQuery(mySlotPreferencesQueryOptions(activeSemesterId));

  const saveMutation = useMutation({
    mutationFn: async (slotsToSave: SlotPreferenceItem[]) => {
      const response = await timetableApi.saveMySlotPreferences(activeSemesterId, {
        slots: slotsToSave.map(({ weekday, pair, preference }) => ({
          weekday,
          pair,
          preference,
        })),
      });

      return response.data.map(({ weekday, pair, preference }) => ({
        weekday,
        pair,
        preference,
      }));
    },
    onSuccess: async (savedSlots) => {
      queryClient.setQueryData(slotPreferenceKeys.bySemester(activeSemesterId), savedSlots);
      setDraftSlots(null);
      toast.success(formatMessage('preferences.savedSuccess'));
      await queryClient.invalidateQueries({
        queryKey: slotPreferenceKeys.bySemester(activeSemesterId),
      });
    },
  });

  const isDirty = draftSlots !== null;
  const isBusy = semestersQuery.isLoading || preferencesQuery.isLoading || saveMutation.isPending;
  const hasError = semestersQuery.isError || preferencesQuery.isError || saveMutation.isError;
  const displayedSlots = draftSlots ?? preferencesQuery.data ?? [];

  const weekdays = useMemo(
    () =>
      Array.from({ length: TEACHING_DAYS_PER_WEEK }, (_, index) => {
        const date = new Date(REFERENCE_MONDAY_YEAR, 0, index + 1);
        const name = new Intl.DateTimeFormat(localeTag, { weekday: 'short' }).format(date);

        return name.charAt(0).toUpperCase() + name.slice(1);
      }),
    [localeTag],
  );

  const handleToggleCell = (weekday: number, pair: number): void => {
    setDraftSlots((previous) =>
      toggleSlotPreference(previous ?? preferencesQuery.data ?? [], weekday, pair),
    );
  };

  const handleSelectSemester = (targetId: string): void => {
    setSelectedSemesterId(targetId);
    setDraftSlots(null);
  };

  const handleDiscard = (): void => {
    setDraftSlots(null);
    saveMutation.reset();
  };

  const handleSave = (): void => {
    if (!activeSemesterId || draftSlots === null) {
      return;
    }

    saveMutation.mutate(draftSlots);
  };

  return (
    <details className={styles.root}>
      <summary className={styles.summary}>{formatMessage('preferences.title')}</summary>
      <p className={styles.description}>{formatMessage('preferences.description')}</p>

      <div className={styles.controls}>
        <label className={styles.semesterLabel}>
          {formatMessage('preferences.semester')}
          <select
            className={styles.select}
            value={activeSemesterId}
            disabled={isBusy || isDirty}
            onChange={(event) => handleSelectSemester(event.target.value)}
          >
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.academicYear} / {semester.semester}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasError && (
        <p role="alert" className={styles.alert}>
          {formatMessage('preferences.error')}
        </p>
      )}

      <div className={styles.scrollContainer}>
        <table className={styles.gridTable}>
          <thead>
            <tr>
              <th className={styles.pairHeader}>{formatMessage('timetable.pairHeader')}</th>
              {weekdays.map((dayName, dayIndex) => (
                <th key={dayIndex} className={styles.dayHeader}>
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
                    const slot = displayedSlots.find(
                      (entry) => entry.weekday === weekday && entry.pair === pair,
                    );
                    const currentPref = slot?.preference;
                    const stateLabel = formatMessage(getPreferenceStateKey(currentPref));
                    const ariaLabel = `${dayName}, ${pair}: ${stateLabel}`;
                    const cellClassName = [
                      styles.slotButton,
                      currentPref === SLOT_PREFERENCE.PREFERRED ? styles.preferred : '',
                      currentPref === SLOT_PREFERENCE.UNDESIRABLE ? styles.undesirable : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <td key={weekday} className={styles.slotCell}>
                        <button
                          type="button"
                          className={cellClassName}
                          disabled={isBusy || !activeSemesterId}
                          aria-label={ariaLabel}
                          onClick={() => handleToggleCell(weekday, pair)}
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

      <div className={styles.actions}>
        <Button type="button" variant="primary" disabled={isBusy || !isDirty} onClick={handleSave}>
          {formatMessage('preferences.save')}
        </Button>
        {isDirty && (
          <Button type="button" variant="secondary" disabled={isBusy} onClick={handleDiscard}>
            {formatMessage('preferences.discard')}
          </Button>
        )}
      </div>
    </details>
  );
}
