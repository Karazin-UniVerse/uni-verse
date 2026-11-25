'use client';

import React from 'react';
import { Empty } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export interface AssignmentsEmptyStateProps {
  hasAssignments: boolean;
  hasDateFilter: boolean;
}

export const AssignmentsEmptyState: React.FC<AssignmentsEmptyStateProps> = ({
  hasAssignments,
  hasDateFilter,
}) => {
  const { formatMessage } = useLanguage();

  if (!hasAssignments) {
    return (
      <Empty
        description={formatMessage('assignments.emptyNotFound')}
        icon={<span style={{ fontSize: '48px' }}>📝</span>}
      />
    );
  }

  if (hasDateFilter) {
    return (
      <Empty
        description={formatMessage('assignments.emptyDateFilter')}
        icon={<span style={{ fontSize: '48px' }}>🔍</span>}
      />
    );
  }

  return (
    <Empty
      description={formatMessage('assignments.emptyAllDone')}
      icon={<span style={{ fontSize: '48px' }}>🏖️</span>}
    />
  );
};
