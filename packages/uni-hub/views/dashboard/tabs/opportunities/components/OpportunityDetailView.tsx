'use client';

import React from 'react';
import { OpportunityDetail } from '@ui';
import type { Opportunity } from '@core/types/opportunities';
import {
  OPPORTUNITY_LIFECYCLE,
  OPPORTUNITY_STATUS,
  type OpportunityLifecycle,
} from '@core/constants/opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OpportunityStatusBadge } from './OpportunityStatusBadge';

export interface OpportunityDetailViewProps {
  onBack: () => void;
  opportunity: Opportunity;
  userId: string | null;
  onSendToReview: (id: string) => void;
  onLifecycleChange: (id: string, state: OpportunityLifecycle) => void;
  onOpenApply: () => void;
  onEdit?: (opportunity: Opportunity) => void;
  onToggleAcceptsApplications?: (id: string, accepts: boolean) => void;
}

const lifecycleLabelKey = {
  START: 'opportunities.detailModal.phaseStart',
  ACTIVE: 'opportunities.detailModal.phaseActive',
  PAUSED: 'opportunities.detailModal.phasePaused',
  COMPLETED: 'opportunities.detailModal.phaseCompleted',
  CANCELLED: 'opportunities.detailModal.phaseCancelled',
} as const;

export const OpportunityDetailView: React.FC<OpportunityDetailViewProps> = ({
  onBack,
  opportunity,
  userId,
  onSendToReview,
  onLifecycleChange,
  onOpenApply,
  onEdit,
  onToggleAcceptsApplications,
}) => {
  const { formatMessage, language } = useLanguage();

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
    !isOwner &&
    opportunity.status === OPPORTUNITY_STATUS.PUBLISHED &&
    (opportunity.lifecycleState === OPPORTUNITY_LIFECYCLE.ACTIVE ||
      opportunity.lifecycleState === OPPORTUNITY_LIFECYCLE.START) &&
    opportunity.acceptsApplications !== false;

  return (
    <OpportunityDetail
      onBack={onBack}
      backText={formatMessage('opportunities.detail.back')}
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
      canEdit={
        isOwner && (opportunity.status === 'DRAFT' || opportunity.status === 'REQUIRES_CHANGES')
      }
      onEdit={onEdit ? () => onEdit(opportunity) : undefined}
      editText={formatMessage('opportunities.detailModal.edit')}
      canSendToReview={
        isOwner && (opportunity.status === 'DRAFT' || opportunity.status === 'REQUIRES_CHANGES')
      }
      onSendToReview={() => onSendToReview(opportunity.id)}
      sendToReviewText={formatMessage('opportunities.detailModal.sendToReview')}
      moderationComment={isOwner ? opportunity.moderationComment : undefined}
      moderationCommentTitle={formatMessage('opportunities.detailModal.moderationFeedback')}
      manageTitle={formatMessage('opportunities.detailModal.manageTitle')}
      phaseLabel={formatMessage('opportunities.detailModal.phaseLabel')}
      lifecycleState={opportunity.lifecycleState}
      lifecycleOptions={lifecycleOptions}
      onLifecycleChange={(state) =>
        onLifecycleChange(opportunity.id, state as OpportunityLifecycle)
      }
      acceptsApplications={opportunity.acceptsApplications !== false}
      onToggleAcceptsApplications={
        onToggleAcceptsApplications
          ? (accepts) => onToggleAcceptsApplications(opportunity.id, accepts)
          : undefined
      }
      acceptsApplicationsLabel={formatMessage('opportunities.detailModal.acceptsApplications')}
      applicationsClosedText={formatMessage('opportunities.detailModal.applicationsClosed')}
      canApply={canApply}
      applyText={formatMessage('opportunities.detailModal.apply')}
      onOpenApply={onOpenApply}
    />
  );
};
