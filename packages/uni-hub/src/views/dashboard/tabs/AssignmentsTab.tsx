'use client';

import React, { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { TextInput as SimpleInput, Select, CheckBox, Empty, Button as SimpleButton } from '@una';
import { AssignmentCard } from '@uni-hub/components/assignments';
import { useAssignmentStatuses } from '@uni-hub/hooks/useAssignmentStatuses';
import { useNow } from '@uni-hub/hooks/useNow';
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
          <Filter size={16} /> {filtersOpen ? 'Сховати фільтри' : 'Фільтри'}
        </SimpleButton>
      </div>
      <div className={`${styles.filters} ${filtersOpen ? styles.filtersOpen : ''}`}>
        <SimpleInput
          type="date"
          size="medium"
          min="2000-01-01"
          max="2099-12-31"
          value={dateFrom}
          onChange={handleDateChange(onDateFromChange)}
          aria-label="Дата від"
        />
        <SimpleInput
          type="date"
          size="medium"
          min="2000-01-01"
          max="2099-12-31"
          value={dateTo}
          onChange={handleDateChange(onDateToChange)}
          aria-label="Дата до"
        />
        <Select
          value={sortOrder}
          onChange={(value) => onSortOrderChange(value as 'asc' | 'desc')}
          options={[
            { value: 'asc', label: 'Спочатку старі' },
            { value: 'desc', label: 'Спочатку нові' },
          ]}
        />
        <label className={styles.checkLabel}>
          <CheckBox
            variant="primary"
            checked={hideCompleted}
            onChange={(event) => onHideCompletedChange(event.target.checked)}
          />
          Сховати виконані
        </label>
      </div>

      {visibleAssignments.length > 0
        ? visibleAssignments.map((item) => (
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
        : (() => {
            if (assignments.length === 0) {
              return (
                <Empty
                  description="Завдань не знайдено"
                  icon={<span style={{ fontSize: '48px' }}>📝</span>}
                />
              );
            }

            if (dateFrom || dateTo) {
              return (
                <Empty
                  description="За обраними датами завдань не знайдено"
                  icon={<span style={{ fontSize: '48px' }}>🔍</span>}
                />
              );
            }

            return (
              <Empty
                description="Ура, всі завдання виконані! Час відпочити або переглянути лекції 🎉"
                icon={<span style={{ fontSize: '48px' }}>🏖️</span>}
              />
            );
          })()}
    </div>
  );
};
