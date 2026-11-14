'use client';

import { useEffect, useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@una';
import {
  DEFAULT_NOMINAL_WEEKS,
  ISO_DATE_PATTERN,
  MS_PER_DAY,
  SUNDAY,
} from '@core/constants/timetable';
import { getSemesterEndMs } from '@core/utils/timetable';
import { RESPONSE_CODES } from '@core/constants/response-codes';
import { hasHttpStatus } from '@uni-hub/utils/httpErrors';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { semesterCalendarQueryOptions, semesterKeys } from './semesterQueries';
import styles from './SemesterSettings.module.scss';

type SemesterDraft = { startDate?: string; weeks?: string };

/** The last class day: teaching weeks run seven days from the start, and Sunday has no classes. */
const getLastTeachingDay = (startDate: string, weeks: number): Date => {
  const lastDayMs = getSemesterEndMs(Date.parse(`${startDate}T00:00:00Z`), weeks) - MS_PER_DAY;

  return new Date(new Date(lastDayMs).getUTCDay() === SUNDAY ? lastDayMs - MS_PER_DAY : lastDayMs);
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
      end: new Intl.DateTimeFormat(localeTag, {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      }).format(getLastTeachingDay(startDate, weekCount)),
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
            aria-describedby={
              valid && weekCount < DEFAULT_NOMINAL_WEEKS ? `${id}-saturdays` : undefined
            }
            disabled={isBusy}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, weeks: event.target.value }))
            }
          />
        </label>
      </div>
      {valid && weekCount < DEFAULT_NOMINAL_WEEKS && (
        <p id={`${id}-saturdays`} className={styles.status} role="status">
          {formatMessage('timetable.shortSemesterSaturdays')}
        </p>
      )}
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
      {save.isError && (
        <p role="alert">
          {formatMessage(
            hasHttpStatus(save.error, RESPONSE_CODES.CONFLICT)
              ? 'timetable.calendarPublishedConflict'
              : 'timetable.calendarError',
          )}
        </p>
      )}
    </section>
  );
}
