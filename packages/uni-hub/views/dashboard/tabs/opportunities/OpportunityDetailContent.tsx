'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@ui';
import type { Opportunity } from '@core/types/opportunities';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { ROUTE } from '../../routes';
import { OpportunityDetailView } from './components/OpportunityDetailView';
import { useApplicants } from './hooks/useApplicants';
import { useApplicantsDeepLink } from './hooks/useApplicantsDeepLink';
import { useApplyToOpportunity } from './hooks/useApplyToOpportunity';
import { useCreateOpportunity } from './hooks/useCreateOpportunity';
import { useOpportunityActions } from './hooks/useOpportunityActions';
import { ApplicantsModal } from './modals/ApplicantsModal';
import { ApplyOpportunityModal } from './modals/ApplyOpportunityModal';
import { CreateOpportunityModal } from './modals/CreateOpportunityModal';

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
  const create = useCreateOpportunity({});
  const apply = useApplyToOpportunity({ currentUser, opportunity });
  const applicants = useApplicants();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (): Promise<void> => {
    setDeleting(true);

    try {
      await actions.handleDeleteOpportunity(opportunity.id);
      router.push(ROUTE.Opportunities);
    } finally {
      setDeleting(false);
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
      />

      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title={formatMessage('opportunities.confirm.deleteTitle')}
        message={formatMessage('opportunities.confirm.delete')}
        cancelLabel={formatMessage('common.cancel')}
        confirmLabel={formatMessage('opportunities.confirm.deleteConfirm')}
        closeLabel={formatMessage('modal.close')}
        loading={deleting}
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
