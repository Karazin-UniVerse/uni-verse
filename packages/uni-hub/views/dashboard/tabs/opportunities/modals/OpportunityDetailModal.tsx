'use client';

import React from 'react';
import { OpportunityDetailModal as OpportunityDetailModalUI } from '@universe/ui';
import type { Opportunity, OpportunityLifecycle } from '@uni-hub/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OpportunityStatusBadge } from '../OpportunityStatusBadge';

export interface OpportunityDetailModalProps {
  open: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  userId: string | null;
  onSendToReview: (id: string) => void;
  onLifecycleChange: (id: string, state: OpportunityLifecycle) => void;
  onOpenApply: () => void;
}

const lifecycleLabelKey = {
  START: 'opportunities.detailModal.phaseStart',
  ACTIVE: 'opportunities.detailModal.phaseActive',
  PAUSED: 'opportunities.detailModal.phasePaused',
  COMPLETED: 'opportunities.detailModal.phaseCompleted',
  CANCELLED: 'opportunities.detailModal.phaseCancelled',
} as const;

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  open,
  onClose,
  opportunity,
  userId,
  onSendToReview,
  onLifecycleChange,
  onOpenApply,
}) => {
  const { formatMessage, language } = useLanguage();

  if (!opportunity) return null;

  const isOwner = userId === opportunity.ownerId;
  const paymentTagText =
    opportunity.paymentType === 'PAID'
      ? formatMessage('opportunities.detailModal.paidWithDetails', {
          details:
            opportunity.paymentDetails || formatMessage('opportunities.detailModal.paidProvided'),
        })
      : formatMessage('opportunities.detailModal.unpaid');

  const lifecycleLabel = opportunity.lifecycleState
    ? formatMessage(
        lifecycleLabelKey[opportunity.lifecycleState] ?? 'opportunities.detailModal.phaseActive',
      )
    : '';

  const lifecycleTagText = lifecycleLabel
    ? `${formatMessage('opportunities.detailModal.phaseLabel')} ${lifecycleLabel}`
    : undefined;

  const lifecycleOptions = [
    {
      value: 'START',
      label: formatMessage('opportunities.detailModal.phaseStart'),
    },
    {
      value: 'ACTIVE',
      label: formatMessage('opportunities.detailModal.phaseActive'),
    },
    {
      value: 'PAUSED',
      label: formatMessage('opportunities.detailModal.phasePaused'),
    },
    {
      value: 'COMPLETED',
      label: formatMessage('opportunities.detailModal.phaseCompleted'),
    },
    {
      value: 'CANCELLED',
      label: formatMessage('opportunities.detailModal.phaseCancelled'),
    },
  ];

  const canApply =
    !isOwner && opportunity.status === 'PUBLISHED' && opportunity.lifecycleState === 'ACTIVE';

  return (
    <OpportunityDetailModalUI
      open={open}
      onClose={onClose}
      title={opportunity.title ?? formatMessage('opportunities.detailModal.defaultTitle')}
      paymentTagText={paymentTagText}
      paymentTone={opportunity.paymentType === 'PAID' ? 'success' : 'neutral'}
      statusBadge={<OpportunityStatusBadge status={opportunity.status} />}
      lifecycleTagText={lifecycleTagText}
      organizerLabel={formatMessage('opportunities.detailModal.organizer')}
      organizerName={
        opportunity.owner?.name ||
        opportunity.owner?.email ||
        formatMessage('opportunities.detailModal.defaultOrganizer')
      }
      publishedDateText={formatMessage('opportunities.detailModal.publishedOn', {
        date: new Date(opportunity.createdAt).toLocaleDateString(
          language === 'uk' ? 'uk-UA' : 'en-US',
        ),
      })}
      descriptionTitle={formatMessage('opportunities.detailModal.descTitle')}
      descriptionText={opportunity.description}
      contactLabel={formatMessage('opportunities.detailModal.contacts')}
      contactValue={opportunity.ownerContactInfo}
      isOwner={isOwner}
      canSendToReview={
        isOwner && (opportunity.status === 'DRAFT' || opportunity.status === 'REQUIRES_CHANGES')
      }
      onSendToReview={() => onSendToReview(opportunity.id)}
      sendToReviewText={formatMessage('opportunities.detailModal.sendToReview')}
      manageTitle={formatMessage('opportunities.detailModal.manageTitle')}
      phaseLabel={formatMessage('opportunities.detailModal.phaseLabel')}
      lifecycleState={opportunity.lifecycleState}
      lifecycleOptions={lifecycleOptions}
      onLifecycleChange={(state) =>
        onLifecycleChange(opportunity.id, state as OpportunityLifecycle)
      }
      closeText={formatMessage('opportunities.detailModal.close')}
      canApply={canApply}
      applyText={formatMessage('opportunities.detailModal.apply')}
      onOpenApply={onOpenApply}
    />
  );
};
