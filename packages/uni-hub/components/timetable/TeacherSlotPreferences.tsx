'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { TEACHING_DAYS_PER_WEEK, type SlotPreference } from '@core/constants/timetable';
import type { SlotPreferenceItem } from '@core/types/timetable';
import { Button, useToast } from '@una';
import { useMediaQuery } from '@uni-hub/hooks/useMediaQuery';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import {
  mySlotPreferencesQueryOptions,
  preferenceSemestersQueryOptions,
  slotPreferenceKeys,
} from './slotPreferencesQueries';
import { setSlotPreference } from './helpers';
import { SlotPreferenceDays } from './SlotPreferenceDays';
import { SlotPreferenceGrid } from './SlotPreferenceGrid';
import styles from './TeacherSlotPreferences.module.scss';

const REFERENCE_MONDAY_YEAR = 2024;

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
  const isMobile = useMediaQuery('less', BREAKPOINTS.md);

  const weekdays = useMemo(
    () =>
      Array.from({ length: TEACHING_DAYS_PER_WEEK }, (_, index) => {
        const date = new Date(REFERENCE_MONDAY_YEAR, 0, index + 1);
        const name = new Intl.DateTimeFormat(localeTag, { weekday: 'short' }).format(date);

        return name.charAt(0).toUpperCase() + name.slice(1);
      }),
    [localeTag],
  );

  const handleChange = (weekday: number, pair: number, preference?: SlotPreference): void => {
    setDraftSlots((previous) =>
      setSlotPreference({
        slots: previous ?? preferencesQuery.data ?? [],
        weekday,
        pair,
        preference,
      }),
    );
  };

  const viewProps = {
    slots: displayedSlots,
    weekdays,
    disabled: isBusy || !activeSemesterId,
    onChange: handleChange,
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

      {isMobile ? <SlotPreferenceDays {...viewProps} /> : <SlotPreferenceGrid {...viewProps} />}

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
