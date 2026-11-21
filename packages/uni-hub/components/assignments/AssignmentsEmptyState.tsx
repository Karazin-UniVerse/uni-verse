'use client';

import React from 'react';
import { ClipboardList, PartyPopper, Search } from 'lucide-react';
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
        icon={<ClipboardList size={48} strokeWidth={1.5} aria-hidden />}
      />
    );
  }

  if (hasDateFilter) {
    return (
      <Empty
        description={formatMessage('assignments.emptyDateFilter')}
        icon={<Search size={48} strokeWidth={1.5} aria-hidden />}
      />
    );
  }

  return (
    <Empty
      description={formatMessage('assignments.emptyAllDone')}
      icon={<PartyPopper size={48} strokeWidth={1.5} aria-hidden />}
    />
  );
};
