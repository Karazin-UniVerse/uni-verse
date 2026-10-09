'use client';

import React from 'react';
import { Tag } from '@una';
import type { OpportunityStatus } from '@uni-hub/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export interface OpportunityStatusBadgeProps {
  status: OpportunityStatus;
}

export const OpportunityStatusBadge: React.FC<OpportunityStatusBadgeProps> = ({ status }) => {
  const { formatMessage } = useLanguage();

  switch (status) {
    case 'DRAFT':
      return <Tag tone="neutral">{formatMessage('opportunities.status.draft')}</Tag>;
    case 'READY_FOR_REVIEW':
      return <Tag tone="info">{formatMessage('opportunities.status.readyForReview')}</Tag>;
    case 'REQUIRES_CHANGES':
      return <Tag tone="warning">{formatMessage('opportunities.status.requiresChanges')}</Tag>;
    case 'PUBLISHED':
      return <Tag tone="success">{formatMessage('opportunities.status.published')}</Tag>;
    case 'REJECTED':
      return <Tag tone="danger">{formatMessage('opportunities.status.rejected')}</Tag>;
    default:
      return <Tag tone="neutral">{status}</Tag>;
  }
};
