'use client';

import React, { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Select, CheckBox, Button as SimpleButton } from '@una';
import {
  AssignmentCard,
  AssignmentsEmptyState,
  useAssignmentStatuses,
} from '@uni-hub/components/assignments';
import { useNow } from '@uni-hub/hooks/useNow';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { AssignmentsTabProps } from '../types';
import styles from '@uni-hub/views/DashboardPage.module.scss';
import { uk } from 'date-fns/locale';
function parseDate(value: string): Date | null {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(date: Date | null): string {
  if (!date) return '';

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
  const { formatMessage } = useLanguage();
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

  return (
    <div className={styles.stack}>
      <div className={styles.mobileFilterToggle}>
        <SimpleButton
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
        </SimpleButton>
      </div>

      <div className={`${styles.filters} ${filtersOpen ? styles.filtersOpen : ''}`}>
        <DatePicker
          selected={parseDate(dateFrom)}
          onChange={(date: Date | null) => onDateFromChange(toDateString(date))}
          locale={uk}
          dateFormat="yyyy-MM-dd"
          isClearable
          placeholderText={formatMessage('assignments.dateFrom')}
          aria-label={formatMessage('assignments.dateFrom')}
          className={styles.dateInput}
          calendarClassName={styles.dateCalendar}
          todayButton="Сьогодні"
          minDate={new Date(2000, 0, 1)}
          maxDate={new Date(2099, 11, 31)}
        />

        <DatePicker
          selected={parseDate(dateTo)}
          onChange={(date: Date | null) => onDateToChange(toDateString(date))}
          locale={uk}
          dateFormat="yyyy-MM-dd"
          isClearable
          placeholderText={formatMessage('assignments.dateTo')}
          aria-label={formatMessage('assignments.dateTo')}
          className={styles.dateInput}
          calendarClassName={styles.dateCalendar}
          todayButton="Сьогодні"
          minDate={new Date(2000, 0, 1)}
          maxDate={new Date(2099, 11, 31)}
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
