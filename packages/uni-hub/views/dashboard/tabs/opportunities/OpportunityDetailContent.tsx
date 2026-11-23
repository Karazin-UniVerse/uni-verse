'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@ui';
import type { Opportunity } from '@core/types/opportunities';
import { OPPORTUNITY_STATUS } from '@core/constants/opportunities';
import { ROLE } from '@core/constants/roles';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { ROUTE } from '../../routes';
import { OpportunityDetailView } from './components/OpportunityDetailView';
import { OpportunityModerationPanel } from './components/OpportunityModerationPanel';
import { useApplicants } from './hooks/useApplicants';
import { useApplicantsDeepLink } from './hooks/useApplicantsDeepLink';
import { useApplyToOpportunity } from './hooks/useApplyToOpportunity';
import { useCreateOpportunity } from './hooks/useCreateOpportunity';
import { useOpportunityActions } from './hooks/useOpportunityActions';
import { ApplicantsModal } from './modals/ApplicantsModal';
import { ApplyOpportunityModal } from './modals/ApplyOpportunityModal';
import { CreateOpportunityModal } from './modals/CreateOpportunityModal';
import { FavoriteToggleButton } from './components/FavoriteToggleButton';
import { canToggleFavorite } from './helpers';
import { hasLoadFailed } from '@uni-hub/queries/load-state';
import { useFavorites } from './hooks/useFavorites';

export interface OpportunityDetailContentProps {
  opportunity: Opportunity;
}

export const OpportunityDetailContent: React.FC<OpportunityDetailContentProps> = ({
  opportunity,
}) => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { formatMessage } = useLanguage();
  const actions = useOpportunityActions();
  const create = useCreateOpportunity({ currentOpportunity: opportunity });
  const apply = useApplyToOpportunity({ currentUser, opportunity });
  const applicants = useApplicants();
  const canFavorite =
    opportunity.status === OPPORTUNITY_STATUS.PUBLISHED &&
    canToggleFavorite(opportunity, currentUser.userId);
  const favorites = useFavorites(canFavorite, { notifyOnSuccess: true });
  const isFavorite = favorites.savedIds.has(opportunity.id);
  const favoriteDisabled =
    favorites.query.isLoading ||
    hasLoadFailed(favorites.query) ||
    favorites.pendingIds.includes(opportunity.id);
  const canModerate =
    Boolean(currentUser.userId) &&
    currentUser.roles.includes(ROLE.OPPORTUNITIES_MODERATOR) &&
    currentUser.userId !== opportunity.ownerId &&
    opportunity.status === OPPORTUNITY_STATUS.READY_FOR_REVIEW;

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);

    try {
      const deleted = await actions.handleDeleteOpportunity(opportunity.id);

      if (deleted) {
        router.push(ROUTE.Opportunities);
      }
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  useApplicantsDeepLink({
    opportunity,
    userId: currentUser.userId,
    openApplicants: applicants.open,
    closeApplicants: applicants.close,
  });

  return (
    <>
      <OpportunityDetailView
        onBack={() => router.push(ROUTE.Opportunities)}
        opportunity={opportunity}
        userId={currentUser.userId}
        onSendToReview={actions.handleSendToReview}
        onEdit={create.openEdit}
        onDelete={() => setDeleteConfirmOpen(true)}
        onOpenApply={() => apply.setIsApplyOpen(true)}
        onOpenApplicants={() => applicants.open(opportunity)}
        favoriteAction={
          canFavorite ? (
            <FavoriteToggleButton
              isFavorite={isFavorite}
              disabled={favoriteDisabled}
              onToggle={() => favorites.toggle(opportunity.id, isFavorite)}
            />
          ) : undefined
        }
      />

      {canModerate && (
        <OpportunityModerationPanel key={opportunity.id} opportunityId={opportunity.id} />
      )}

      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title={formatMessage('opportunities.confirm.deleteTitle')}
        message={formatMessage('opportunities.confirm.delete')}
        cancelLabel={formatMessage('common.cancel')}
        confirmLabel={formatMessage('opportunities.confirm.deleteConfirm')}
        closeLabel={formatMessage('modal.close')}
        loading={isDeleting}
        variant="danger"
      />

      <CreateOpportunityModal
        open={create.isOpen}
        onClose={create.close}
        formData={create.formData}
        setFormData={create.setFormData}
        onSubmit={create.handleSubmit}
        submitting={create.creating}
        isEdit={create.isEdit}
        remoderationWarning={create.willRemoderate}
      />

      <ApplyOpportunityModal
        open={apply.isApplyOpen}
        onClose={() => apply.setIsApplyOpen(false)}
        opportunityTitle={opportunity.title}
        motivation={apply.motivation}
        onMotivationChange={apply.setMotivation}
        contactInfo={apply.contactInfo}
        onContactInfoChange={apply.setContactInfo}
        onSubmit={apply.handleApplySubmit}
        submitting={apply.applying}
      />

      <ApplicantsModal
        open={applicants.isOpen}
        onClose={applicants.close}
        applications={applicants.applications}
        loading={applicants.loading}
        isError={applicants.isError}
        onRetry={applicants.refetch}
        onUpdateStatus={applicants.handleUpdateStatus}
      />
    </>
  );
};
