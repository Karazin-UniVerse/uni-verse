'use client';

import { useEffect, useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@una';
import { DEFAULT_NOMINAL_WEEKS, ISO_DATE_PATTERN } from '@core/constants/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { semesterCalendarQueryOptions, semesterKeys } from './semesterQueries';
import styles from './SemesterSettings.module.scss';

type SemesterDraft = { startDate?: string; weeks?: string };

// The last teaching day is the Saturday of the last week when the semester starts on a Monday.
const DAYS_FROM_MONDAY_TO_SATURDAY = 5;

const getLastTeachingDay = (startDate: string, weeks: number): Date => {
  const date = new Date(`${startDate}T00:00:00`);

  date.setDate(date.getDate() + (weeks - 1) * 7 + DAYS_FROM_MONDAY_TO_SATURDAY);

  return date;
};

export function SemesterSettings({
  academicYear,
  semester,
  onReadyChange,
}: {
  academicYear: string;
  semester: number;
  onReadyChange: (ready: boolean) => void;
}): React.JSX.Element {
  const { formatMessage, localeTag } = useLanguage();
  const id = useId();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SemesterDraft>({});
  const calendar = useQuery(semesterCalendarQueryOptions(academicYear, semester));
  const savedStart = calendar.data?.startDate.slice(0, 10) ?? '';
  const startDate = draft.startDate ?? savedStart;
  const weeks = draft.weeks ?? String(calendar.data?.teachingWeeks ?? DEFAULT_NOMINAL_WEEKS);
  const weekCount = Number(weeks);
  const valid =
    ISO_DATE_PATTERN.test(startDate) && Number.isSafeInteger(weekCount) && weekCount > 0;
  const dirty =
    !calendar.data || startDate !== savedStart || weekCount !== calendar.data.teachingWeeks;
  const save = useMutation({
    mutationFn: async () => {
      if (!valid) {
        throw new Error(formatMessage('timetable.calendarError'));
      }

      return (
        await timetableApi.configureSemesterCalendar({
          academicYear,
          semester,
          startDate,
          teachingWeeks: weekCount,
          excludedDates: calendar.data?.excludedDates ?? [],
          makeupSaturdays: calendar.data?.makeupSaturdays ?? [],
        })
      ).data;
    },
    onSuccess: async (saved) => {
      const queryKey = semesterKeys.calendar(academicYear, semester);

      queryClient.setQueryData(queryKey, saved);
      setDraft({});
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const ready = calendar.isSuccess && !dirty && valid && !save.isPending;
  const isBusy = calendar.isLoading || save.isPending;

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  let status = formatMessage('timetable.semesterUnsaved');

  if (ready) {
    status = formatMessage('timetable.semesterSavedUntil', {
      end: new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'long' }).format(
        getLastTeachingDay(startDate, weekCount),
      ),
    });
  } else if (!calendar.data && !calendar.isLoading) {
    status = formatMessage('timetable.semesterMissing');
  }

  return (
    <section className={styles.root} aria-label={formatMessage('timetable.semesterSettings')}>
      <div className={styles.fields}>
        <label htmlFor={`${id}-start`}>
          {formatMessage('timetable.semesterStart')}
          <input
            id={`${id}-start`}
            type="date"
            value={startDate}
            disabled={isBusy}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, startDate: event.target.value }))
            }
          />
        </label>
        <label htmlFor={`${id}-weeks`}>
          {formatMessage('timetable.teachingWeeks')}
          <input
            id={`${id}-weeks`}
            type="number"
            min={1}
            step={1}
            value={weeks}
            disabled={isBusy}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, weeks: event.target.value }))
            }
          />
        </label>
      </div>
      <p className={ready ? styles.ready : styles.status} role="status">
        {status}
      </p>
      {dirty && (
        <Button
          type="button"
          size="small"
          disabled={!valid || save.isPending}
          onClick={() => save.mutate()}
        >
          {formatMessage('timetable.saveSemesterSettings')}
        </Button>
      )}
      {save.isError && <p role="alert">{formatMessage('timetable.calendarError')}</p>}
    </section>
  );
}
