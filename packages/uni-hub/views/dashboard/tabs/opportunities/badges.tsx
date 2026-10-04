import React from 'react';
import clsx from 'clsx';
import { Tag } from '@una';
import { Send, Clock, CheckCircle2, XCircle, X } from 'lucide-react';
import type { OpportunityStatus, OpportunityAppStatus } from '@uni-hub/types';
import styles from '../OpportunitiesTab.module.scss';

export const getStatusBadge = (status: OpportunityStatus) => {
  switch (status) {
    case 'DRAFT':
      return <Tag tone="neutral">Чернетка</Tag>;
    case 'READY_FOR_REVIEW':
      return <Tag tone="info">На модерації</Tag>;
    case 'REQUIRES_CHANGES':
      return <Tag tone="warning">Потребує правок</Tag>;
    case 'PUBLISHED':
      return <Tag tone="success">Опубліковано</Tag>;
    case 'REJECTED':
      return <Tag tone="danger">Відхилено</Tag>;
    default:
      return <Tag tone="neutral">{status}</Tag>;
  }
};

export const getApplicationStatusBadge = (status: OpportunityAppStatus) => {
  switch (status) {
    case 'SUBMITTED':
      return (
        <span className={clsx(styles.appStatusBadge, styles.badgeSubmitted)}>
          <Send size={12} />
          <span>Надіслано</span>
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className={clsx(styles.appStatusBadge, styles.badgeReview)}>
          <Clock size={12} />
          <span>На розгляді</span>
        </span>
      );
    case 'ACCEPTED':
      return (
        <span className={clsx(styles.appStatusBadge, styles.badgeAccepted)}>
          <CheckCircle2 size={12} />
          <span>Прийнято</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className={clsx(styles.appStatusBadge, styles.badgeRejected)}>
          <XCircle size={12} />
          <span>Відхилено</span>
        </span>
      );
    case 'WITHDRAWN':
      return (
        <span className={clsx(styles.appStatusBadge, styles.badgeWithdrawn)}>
          <X size={12} />
          <span>Відкликано</span>
        </span>
      );
    default:
      return <Tag tone="neutral">{status}</Tag>;
  }
};
