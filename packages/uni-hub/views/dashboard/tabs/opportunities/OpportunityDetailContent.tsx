'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { Opportunity } from '@core/types/opportunities';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { ROUTE } from '../../routes';
import { OpportunityDetailView } from './components/OpportunityDetailView';
import { useApplyToOpportunity } from './hooks/useApplyToOpportunity';
import { useCreateOpportunity } from './hooks/useCreateOpportunity';
import { useOpportunityActions } from './hooks/useOpportunityActions';
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

  return (
    <>
      <OpportunityDetailView
        onBack={() => router.push(ROUTE.Opportunities)}
        opportunity={opportunity}
        userId={currentUser.userId}
        onSendToReview={actions.handleSendToReview}
        onLifecycleChange={actions.handleLifecycleChange}
        onEdit={create.openEdit}
        onOpenApply={() => apply.setIsApplyOpen(true)}
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
    </>
  );
};
