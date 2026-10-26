'use client';

import React from 'react';
import { OpportunityDetail } from '@ui';
import type { Opportunity } from '@core/types/opportunities';
import { OPPORTUNITY_LIFECYCLE, OPPORTUNITY_STATUS } from '@core/constants/opportunities';
import { useLanguage, type FormatMessage } from '@uni-hub/i18n/LanguageContext';
import { OpportunityStatusBadge } from './OpportunityStatusBadge';

export interface OpportunityDetailViewProps {
  onBack: () => void;
  opportunity: Opportunity;
  userId: string | null;
  onSendToReview: (id: string) => void;
  onOpenApply: () => void;
  onOpenApplicants?: () => void;
  onEdit?: (opportunity: Opportunity) => void;
  onDelete?: () => void;
}

const lifecycleLabelKey = {
  START: 'opportunities.detailModal.phaseStart',
  ACTIVE: 'opportunities.detailModal.phaseActive',
  PAUSED: 'opportunities.detailModal.phasePaused',
  COMPLETED: 'opportunities.detailModal.phaseCompleted',
  CANCELLED: 'opportunities.detailModal.phaseCancelled',
} as const;

function getPaymentTagText(opportunity: Opportunity, formatMessage: FormatMessage): string {
  if (opportunity.paymentType !== 'PAID') {
    return formatMessage('opportunities.detailModal.unpaid');
  }

  const details =
    opportunity.paymentDetails || formatMessage('opportunities.detailModal.paidProvided');

  return formatMessage('opportunities.detailModal.paidWithDetails', { details });
}

function getLifecycleTagText(
  opportunity: Opportunity,
  formatMessage: FormatMessage,
): string | undefined {
  if (!opportunity.lifecycleState) {
    return undefined;
  }

  const key =
    lifecycleLabelKey[opportunity.lifecycleState] ?? 'opportunities.detailModal.phaseActive';
  const label = formatMessage(key);

  return `${formatMessage('opportunities.detailModal.phaseLabel')} ${label}`;
}

function canApplyOpportunity(opportunity: Opportunity, isOwner: boolean): boolean {
  if (isOwner || opportunity.status !== OPPORTUNITY_STATUS.PUBLISHED) {
    return false;
  }

  const isLifecycleOpen =
    opportunity.lifecycleState === OPPORTUNITY_LIFECYCLE.ACTIVE ||
    opportunity.lifecycleState === OPPORTUNITY_LIFECYCLE.START;

  return isLifecycleOpen && opportunity.acceptsApplications !== false;
}

function getOrganizerName(opportunity: Opportunity, formatMessage: FormatMessage): string {
  return (
    opportunity.owner?.name ||
    opportunity.owner?.email ||
    formatMessage('opportunities.detailModal.defaultOrganizer')
  );
}

export const OpportunityDetailView: React.FC<OpportunityDetailViewProps> = ({
  onBack,
  opportunity,
  userId,
  onSendToReview,
  onOpenApply,
  onOpenApplicants,
  onEdit,
  onDelete,
}) => {
  const { formatMessage, language } = useLanguage();

  const isOwner = userId === opportunity.ownerId;
  const canManageDraft =
    isOwner &&
    (opportunity.status === OPPORTUNITY_STATUS.DRAFT ||
      opportunity.status === OPPORTUNITY_STATUS.REQUIRES_CHANGES);
  const sendToReviewDisabled =
    opportunity.status === OPPORTUNITY_STATUS.REQUIRES_CHANGES && opportunity.canResubmit !== true;
  const sendToReviewHint = sendToReviewDisabled
    ? formatMessage('opportunities.errors.changesRequired')
    : undefined;
  const paymentTagText = getPaymentTagText(opportunity, formatMessage);
  const lifecycleTagText = getLifecycleTagText(opportunity, formatMessage);
  const organizerName = getOrganizerName(opportunity, formatMessage);
  const canApply = canApplyOpportunity(opportunity, isOwner);

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
      organizerName={organizerName}
      publishedDateText={formatMessage('opportunities.detailModal.publishedOn', {
        date: new Date(opportunity.createdAt).toLocaleDateString(
          language === 'uk' ? 'uk-UA' : 'en-US',
        ),
      })}
      descriptionTitle={formatMessage('opportunities.detailModal.descTitle')}
      descriptionText={opportunity.description}
      contactLabel={formatMessage('opportunities.detailModal.contacts')}
      contactValue={opportunity.ownerContactInfo.trim()}
      emailLabel={formatMessage('opportunities.detailModal.email')}
      emailValue={opportunity.owner?.email}
      isOwner={isOwner}
      canEdit={canManageDraft}
      onEdit={onEdit ? () => onEdit(opportunity) : undefined}
      editText={formatMessage('opportunities.detailModal.edit')}
      canSendToReview={canManageDraft}
      onSendToReview={() => onSendToReview(opportunity.id)}
      sendToReviewDisabled={sendToReviewDisabled}
      sendToReviewHint={sendToReviewHint}
      sendToReviewText={formatMessage('opportunities.detailModal.sendToReview')}
      canDelete={canManageDraft}
      onDelete={onDelete}
      deleteText={formatMessage('opportunities.detailModal.delete')}
      onOpenApplicants={onOpenApplicants}
      viewApplicantsText={formatMessage('opportunities.card.applications')}
      moderationComment={isOwner ? opportunity.moderationComment : undefined}
      moderationCommentTitle={formatMessage('opportunities.detailModal.moderationFeedback')}
      manageTitle={formatMessage('opportunities.detailModal.manageTitle')}
      acceptsApplications={opportunity.acceptsApplications !== false}
      applicationsClosedText={formatMessage('opportunities.detailModal.applicationsClosed')}
      canApply={canApply}
      applyText={formatMessage('opportunities.detailModal.apply')}
      onOpenApply={onOpenApply}
    />
  );
};
