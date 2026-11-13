import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ACADEMIC_HOURS_PER_PAIR, DEFAULT_NOMINAL_WEEKS } from '@core/constants/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { SemesterSettings } from './SemesterSettings';
import {
  semesterCalendarQueryOptions,
  semesterSlotPreferencesQueryOptions,
} from './semesterQueries';
import type { WorkloadRow } from './TimetableManagement';
import styles from './TimetableManagement.module.scss';

type WorkloadSummaryProps = {
  academicYear: string;
  semester: number;
  workload: WorkloadRow[];
  onCalendarReadyChange: (ready: boolean) => void;
};

/** What generation will work with: the semester, the load, unassigned classes and teacher slots. */
export const WorkloadSummary: React.FC<WorkloadSummaryProps> = ({
  academicYear,
  semester,
  workload,
  onCalendarReadyChange,
}) => {
  const { formatMessage } = useLanguage();
  const calendar = useQuery(semesterCalendarQueryOptions(academicYear, semester));
  const preferences = useQuery(semesterSlotPreferencesQueryOptions(calendar.data?.id ?? ''));
  const hours = workload.reduce((total, row) => total + row.academicHours, 0);
  const weeks = calendar.data?.teachingWeeks ?? DEFAULT_NOMINAL_WEEKS;
  const unassigned = workload.filter((row) => !row.teacherId).length;
  const teacherIds = new Set(workload.flatMap((row) => (row.teacherId ? [row.teacherId] : [])));
  const filledIds = new Set((preferences.data ?? []).map((slot) => slot.teacherId));
  const filled = [...teacherIds].filter((teacherId) => filledIds.has(teacherId)).length;

  return (
    <section className={styles.summary} aria-label={formatMessage('timetable.semesterSettings')}>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>{formatMessage('timetable.semesterSettings')}</span>
        <SemesterSettings
          academicYear={academicYear}
          semester={semester}
          onReadyChange={onCalendarReadyChange}
        />
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>{formatMessage('timetable.summaryWorkload')}</span>
        <strong>
          {formatMessage('timetable.summaryWorkloadValue', { count: workload.length, hours })}
        </strong>
        <span className={styles.summaryHint}>
          {formatMessage('timetable.summaryPairsPerWeek', {
            pairs: Math.round(hours / ACADEMIC_HOURS_PER_PAIR / weeks),
          })}
        </span>
      </div>
      <div className={`${styles.summaryCard} ${unassigned > 0 ? styles.summaryWarning : ''}`}>
        <span className={styles.summaryLabel}>{formatMessage('timetable.summaryNoTeacher')}</span>
        <strong>
          {unassigned > 0
            ? formatMessage('timetable.summaryNoTeacherValue', { count: unassigned })
            : formatMessage('timetable.summaryAllAssigned')}
        </strong>
        {unassigned > 0 && (
          <span className={styles.summaryHint}>
            {formatMessage('timetable.summaryNoTeacherHint')}
          </span>
        )}
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>{formatMessage('timetable.summarySlots')}</span>
        <strong>
          {formatMessage('timetable.summarySlotsValue', { filled, total: teacherIds.size })}
        </strong>
        {filled < teacherIds.size && (
          <span className={styles.summaryHint}>{formatMessage('timetable.summarySlotsHint')}</span>
        )}
      </div>
    </section>
  );
};
