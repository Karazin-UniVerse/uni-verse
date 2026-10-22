'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { Opportunity } from '@core/types/opportunities';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
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
  const actions = useOpportunityActions();
  const create = useCreateOpportunity({});
  const apply = useApplyToOpportunity({ currentUser, opportunity });
  const applicants = useApplicants();

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
        onLifecycleChange={actions.handleLifecycleChange}
        onToggleAcceptsApplications={(accepts) =>
          actions.handleToggleAcceptsApplications(opportunity.id, accepts)
        }
        onEdit={create.openEdit}
        onOpenApply={() => apply.setIsApplyOpen(true)}
        onOpenApplicants={() => applicants.open(opportunity)}
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
