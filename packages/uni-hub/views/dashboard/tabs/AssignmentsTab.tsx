'use client';

import React, { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { DateTime, Select, CheckBox, Button } from '@una';
import {
  AssignmentCard,
  AssignmentsEmptyState,
  useAssignmentStatuses,
} from '@uni-hub/components/assignments';
import { useNow } from '@uni-hub/hooks/useNow';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { AssignmentsTabProps } from '../types';
import styles from '@uni-hub/views/dashboard/layout/DashboardShell.module.scss';

function parseFilterDate(dateStr: string): Date | null {
  if (!dateStr) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatFilterDate(date: Date | null): string {
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export const AssignmentsTab: React.FC<AssignmentsTabProps> = ({
  assignments,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  sortOrder,
  onSortOrderChange,
  hideCompleted,
  onHideCompletedChange,
  soundEnabled,
  onOpenAssignment,
}) => {
  const { localeTag, formatMessage } = useLanguage();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const localStatuses = useAssignmentStatuses(assignments);

  const visibleAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const status = item.submissionStatus ?? localStatuses[item.id]?.status;
      const isCompleted = status === 'submitted' || status === 'graded' || Boolean(item.graded);

      return !hideCompleted || !isCompleted;
    });
  }, [assignments, hideCompleted, localStatuses]);

  const nowMs = useNow(30_000);
  const nowSec = Math.floor(nowMs / 1000);

  const selectedDateFrom = useMemo(() => parseFilterDate(dateFrom), [dateFrom]);
  const selectedDateTo = useMemo(() => parseFilterDate(dateTo), [dateTo]);

  return (
    <div className={styles.stack}>
      <div className={styles.mobileFilterToggle}>
        <Button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          variant="secondary"
          size="small"
          aria-expanded={filtersOpen}
        >
          <Filter size={16} />{' '}
          {filtersOpen
            ? formatMessage('assignments.hideFilters')
            : formatMessage('assignments.filters')}
        </Button>
      </div>
      <div className={`${styles.filters} ${filtersOpen ? styles.filtersOpen : ''}`}>
        <DateTime
          showTime={false}
          locale={localeTag}
          selected={selectedDateFrom}
          onChange={(newDate) => onDateFromChange(formatFilterDate(newDate))}
          placeholder={formatMessage('assignments.dateFrom')}
          aria-label={formatMessage('assignments.dateFrom')}
          dialogLabel={formatMessage('assignments.datePicker')}
          clearLabel={formatMessage('common.clear')}
          todayLabel={formatMessage('common.today')}
          className={styles.dateFilterInput}
        />
        <DateTime
          showTime={false}
          locale={localeTag}
          selected={selectedDateTo}
          onChange={(newDate) => onDateToChange(formatFilterDate(newDate))}
          placeholder={formatMessage('assignments.dateTo')}
          aria-label={formatMessage('assignments.dateTo')}
          dialogLabel={formatMessage('assignments.datePicker')}
          clearLabel={formatMessage('common.clear')}
          todayLabel={formatMessage('common.today')}
          className={styles.dateFilterInput}
        />
        <Select
          value={sortOrder}
          onChange={(value) => onSortOrderChange(value as 'asc' | 'desc')}
          options={[
            { value: 'asc', label: formatMessage('assignments.oldestFirst') },
            { value: 'desc', label: formatMessage('assignments.newestFirst') },
          ]}
        />
        <label className={styles.checkLabel}>
          <CheckBox
            variant="primary"
            checked={hideCompleted}
            onChange={(event) => onHideCompletedChange(event.target.checked)}
          />
          {formatMessage('assignments.hideCompleted')}
        </label>
      </div>

      {visibleAssignments.length > 0 ? (
        visibleAssignments.map((item) => (
          <AssignmentCard
            key={item.id}
            assignment={item}
            status={item.submissionStatus ?? localStatuses[item.id]?.status ?? 'new'}
            grade={item.grade ?? localStatuses[item.id]?.grade}
            nowSec={nowSec}
            soundEnabled={soundEnabled}
            onOpenAssignment={onOpenAssignment}
          />
        ))
      ) : (
        <AssignmentsEmptyState
          hasAssignments={assignments.length > 0}
          hasDateFilter={Boolean(dateFrom || dateTo)}
        />
      )}
    </div>
  );
};
