import React from 'react';
import { Empty } from '@una';

export interface AssignmentsEmptyStateProps {
  hasAssignments: boolean;
  hasDateFilter: boolean;
}

export const AssignmentsEmptyState: React.FC<AssignmentsEmptyStateProps> = ({
  hasAssignments,
  hasDateFilter,
}) => {
  if (!hasAssignments) {
    return (
      <Empty
        description="Завдань не знайдено"
        icon={<span style={{ fontSize: '48px' }}>📝</span>}
      />
    );
  }

  if (hasDateFilter) {
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
};
