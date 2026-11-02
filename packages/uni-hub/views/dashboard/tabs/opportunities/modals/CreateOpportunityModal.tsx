'use client';

import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CreateOpportunityModal as CreateOpportunityModalUI } from '@ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OPPORTUNITY_LIFECYCLE } from '@core/constants/opportunities';
import { loadTagSuggestions } from '../queries';
import type { CreateOpportunityFormData } from '../types';

export interface CreateOpportunityModalProps {
  open: boolean;
  onClose: () => void;
  formData: CreateOpportunityFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateOpportunityFormData>>;
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  submitting: boolean;
  isEdit?: boolean;
  remoderationWarning?: boolean;
}

export const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSubmit,
  submitting,
  isEdit = false,
  remoderationWarning = false,
}) => {
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();
  const loadSuggestions = (query: string): Promise<string[]> =>
    loadTagSuggestions(queryClient, query);

  const lifecycleOptions = [
    {
      value: OPPORTUNITY_LIFECYCLE.START,
      label: formatMessage('opportunities.detailModal.phaseStart'),
    },
    {
      value: OPPORTUNITY_LIFECYCLE.ACTIVE,
      label: formatMessage('opportunities.detailModal.phaseActive'),
    },
    {
      value: OPPORTUNITY_LIFECYCLE.PAUSED,
      label: formatMessage('opportunities.detailModal.phasePaused'),
    },
    {
      value: OPPORTUNITY_LIFECYCLE.COMPLETED,
      label: formatMessage('opportunities.detailModal.phaseCompleted'),
    },
    {
      value: OPPORTUNITY_LIFECYCLE.CANCELLED,
      label: formatMessage('opportunities.detailModal.phaseCancelled'),
    },
  ];

  return (
    <CreateOpportunityModalUI
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? formatMessage('opportunities.createModal.editTitle')
          : formatMessage('opportunities.createModal.title')
      }
      formData={formData}
      setFormData={setFormData}
      onSubmit={onSubmit}
      submitting={submitting}
      titleLabel={formatMessage('opportunities.createModal.titleLabel')}
      titlePlaceholder={formatMessage('opportunities.createModal.titlePlaceholder')}
      descLabel={formatMessage('opportunities.createModal.descLabel')}
      descPlaceholder={formatMessage('opportunities.createModal.descPlaceholder')}
      contactLabel={formatMessage('opportunities.alternativeContact')}
      contactPlaceholder={formatMessage('opportunities.createModal.contactPlaceholder')}
      contactHint={formatMessage('opportunities.contactHint')}
      paymentTypeLabel={formatMessage('opportunities.createModal.paymentTypeLabel')}
      paymentDetailsLabel={formatMessage('opportunities.createModal.paymentDetailsLabel')}
      paymentDetailsPlaceholder={formatMessage(
        'opportunities.createModal.paymentDetailsPlaceholder',
      )}
      phaseLabel={formatMessage('opportunities.createModal.phaseLabel')}
      lifecycleOptions={lifecycleOptions}
      unpaidOptionLabel={formatMessage('opportunities.createModal.unpaidOption')}
      paidOptionLabel={formatMessage('opportunities.createModal.paidOption')}
      acceptsApplicationsLabel={formatMessage('opportunities.createModal.acceptsApplications')}
      tagsLabel={formatMessage('opportunities.catalog.filterTagsLabel')}
      tagsPlaceholder={formatMessage('opportunities.catalog.filterTagsPlaceholder')}
      removeTagLabel={formatMessage('opportunities.tags.remove')}
      formatCreateTagLabel={(tag) => formatMessage('opportunities.tags.create', { tag })}
      loadTagSuggestions={loadSuggestions}
      remoderationWarning={
        remoderationWarning
          ? formatMessage('opportunities.createModal.remoderationWarning')
          : undefined
      }
      cancelText={formatMessage('opportunities.createModal.cancel')}
      submitText={
        isEdit
          ? formatMessage('opportunities.createModal.saveChanges')
          : formatMessage('opportunities.createModal.submit')
      }
      savingText={formatMessage('opportunities.createModal.saving')}
    />
  );
};
