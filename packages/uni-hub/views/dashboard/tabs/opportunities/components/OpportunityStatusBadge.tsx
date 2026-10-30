'use client';

import React from 'react';
import { Tag } from '@una';
import { OPPORTUNITY_STATUS, type OpportunityStatus } from '@core/constants/opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export interface OpportunityStatusBadgeProps {
  status: OpportunityStatus;
  size?: 'small' | 'medium';
}

export const OpportunityStatusBadge: React.FC<OpportunityStatusBadgeProps> = ({
  status,
  size = 'small',
}) => {
  const { formatMessage } = useLanguage();

  switch (status) {
    case OPPORTUNITY_STATUS.DRAFT:
      return (
        <Tag tone="neutral" size={size}>
          {formatMessage('opportunities.status.draft')}
        </Tag>
      );
    case OPPORTUNITY_STATUS.READY_FOR_REVIEW:
      return (
        <Tag tone="info" size={size}>
          {formatMessage('opportunities.status.readyForReview')}
        </Tag>
      );
    case OPPORTUNITY_STATUS.REQUIRES_CHANGES:
      return (
        <Tag tone="warning" size={size}>
          {formatMessage('opportunities.status.requiresChanges')}
        </Tag>
      );
    case OPPORTUNITY_STATUS.PUBLISHED:
      return (
        <Tag tone="success" size={size}>
          {formatMessage('opportunities.status.published')}
        </Tag>
      );
    case OPPORTUNITY_STATUS.REJECTED:
      return (
        <Tag tone="danger" size={size}>
          {formatMessage('opportunities.status.rejected')}
        </Tag>
      );
    default:
      return (
        <Tag tone="neutral" size={size}>
          {status}
        </Tag>
      );
  }
};
