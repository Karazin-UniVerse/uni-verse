'use client';

import React from 'react';
import clsx from 'clsx';
import { Tag } from '@una';
import { Send, Clock, CheckCircle2, XCircle, X } from 'lucide-react';
import type { OpportunityAppStatus } from '@uni-hub/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '../OpportunitiesTab.module.scss';

export interface ApplicationStatusBadgeProps {
  status: OpportunityAppStatus;
}

export const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({ status }) => {
  const { formatMessage } = useLanguage();

  switch (status) {
    case 'SUBMITTED':
      return (
        <span className={clsx(styles.appStatusBadge, styles.badgeSubmitted)}>
          <Send size={12} />
          <span>{formatMessage('opportunities.appStatus.submitted')}</span>
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className={clsx(styles.appStatusBadge, styles.badgeReview)}>
          <Clock size={12} />
          <span>{formatMessage('opportunities.appStatus.underReview')}</span>
        </span>
      );
    case 'ACCEPTED':
      return (
        <span className={clsx(styles.appStatusBadge, styles.badgeAccepted)}>
          <CheckCircle2 size={12} />
          <span>{formatMessage('opportunities.appStatus.accepted')}</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className={clsx(styles.appStatusBadge, styles.badgeRejected)}>
          <XCircle size={12} />
          <span>{formatMessage('opportunities.appStatus.rejected')}</span>
        </span>
      );
    case 'WITHDRAWN':
      return (
        <span className={clsx(styles.appStatusBadge, styles.badgeWithdrawn)}>
          <X size={12} />
          <span>{formatMessage('opportunities.appStatus.withdrawn')}</span>
        </span>
      );
    default:
      return <Tag tone="neutral">{status}</Tag>;
  }
};
