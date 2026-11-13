'use client';

import { useEffect, useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import styles from './SemesterSettings.module.scss';

export function SemesterSettings({
  academicYear,
  semester,
  onReadyChange,
}: {
  academicYear: string;
  semester: number;
  onReadyChange: (ready: boolean) => void;
}): React.JSX.Element {
  const { formatMessage } = useLanguage();
  const id = useId();
  const queryClient = useQueryClient();
  const [draftWeeks, setDraftWeeks] = useState<string | null>(null);
  const queryKey = ['timetable', 'semesterCalendar', academicYear, semester];
  const calendar = useQuery({
    queryKey,
    queryFn: async () => (await timetableApi.getSemesterCalendar(academicYear, semester)).data,
  });
  const weeks = draftWeeks ?? String(calendar.data?.teachingWeeks ?? '');
  const valid = Number.isSafeInteger(Number(weeks)) && Number(weeks) > 0;
  const dirty = draftWeeks !== null && Number(draftWeeks) !== calendar.data?.teachingWeeks;
  const save = useMutation({
    mutationFn: async () => {
      if (!calendar.data || !valid) {
        throw new Error(formatMessage('timetable.calendarError'));
      }

      return (
        await timetableApi.configureSemesterCalendar({
          academicYear,
          semester,
          startDate: calendar.data.startDate.slice(0, 10),
          teachingWeeks: Number(weeks),
          excludedDates: calendar.data.excludedDates ?? [],
          makeupSaturdays: calendar.data.makeupSaturdays ?? [],
        })
      ).data;
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKey, saved);
      setDraftWeeks(null);
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const ready = calendar.isSuccess && !dirty && valid && !save.isPending;

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  return (
    <section className={styles.root} aria-label={formatMessage('timetable.semesterSettings')}>
      <label htmlFor={id}>{formatMessage('timetable.teachingWeeks')}</label>
      <input
        id={id}
        type="number"
        min={1}
        step={1}
        value={weeks}
        disabled={calendar.isLoading || save.isPending || !calendar.data}
        onChange={(event) => setDraftWeeks(event.target.value)}
      />
      <Button
        type="button"
        disabled={!dirty || !valid || save.isPending}
        onClick={() => save.mutate()}
      >
        {formatMessage('timetable.saveSemesterSettings')}
      </Button>
      {(calendar.isError || save.isError) && (
        <p role="alert">{formatMessage('timetable.calendarError')}</p>
      )}
      {calendar.isError && (
        <Button type="button" onClick={() => void calendar.refetch()}>
          {formatMessage('timetable.retryCalendar')}
        </Button>
      )}
    </section>
  );
}
