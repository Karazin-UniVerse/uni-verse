'use client';

import React, { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { TextInput as SimpleInput, Select, CheckBox, Button as SimpleButton } from '@una';
import {
  AssignmentCard,
  AssignmentsEmptyState,
  useAssignmentStatuses,
} from '@uni-hub/components/assignments';
import { useNow } from '@uni-hub/hooks/useNow';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { AssignmentsTabProps } from '../types';
import styles from '@uni-hub/views/DashboardPage.module.scss';

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

  const handleDateChange =
    (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      if (!value) {
        setter('');

        return;
      }

      const [yearStr] = value.split('-');

      if (yearStr && yearStr.length > 4) {
        return;
      }

      setter(value);
    };

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
        <SimpleInput
          type="date"
          lang={localeTag}
          size="medium"
          min="2000-01-01"
          max="2099-12-31"
          value={dateFrom}
          onChange={handleDateChange(onDateFromChange)}
          aria-label={formatMessage('assignments.dateFrom')}
        />
        <SimpleInput
          type="date"
          lang={localeTag}
          size="medium"
          min="2000-01-01"
          max="2099-12-31"
          value={dateTo}
          onChange={handleDateChange(onDateToChange)}
          aria-label={formatMessage('assignments.dateTo')}
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
