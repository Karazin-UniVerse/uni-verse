'use client';

import React from 'react';
import { CreateOpportunityModal as CreateOpportunityModalUI } from '@universe/ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { CreateOpportunityFormData } from '../types';

export interface CreateOpportunityModalProps {
  open: boolean;
  onClose: () => void;
  formData: CreateOpportunityFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateOpportunityFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSubmit,
  submitting,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <CreateOpportunityModalUI
      open={open}
      onClose={onClose}
      title={formatMessage('opportunities.createModal.title')}
      formData={formData}
      setFormData={setFormData}
      onSubmit={onSubmit}
      submitting={submitting}
      titleLabel={formatMessage('opportunities.createModal.titleLabel')}
      titlePlaceholder={formatMessage('opportunities.createModal.titlePlaceholder')}
      descLabel={formatMessage('opportunities.createModal.descLabel')}
      descPlaceholder={formatMessage('opportunities.createModal.descPlaceholder')}
      contactLabel={formatMessage('opportunities.createModal.contactLabel')}
      contactPlaceholder={formatMessage('opportunities.createModal.contactPlaceholder')}
      paymentTypeLabel={formatMessage('opportunities.createModal.paymentTypeLabel')}
      paymentDetailsLabel={formatMessage('opportunities.createModal.paymentDetailsLabel')}
      paymentDetailsPlaceholder={formatMessage(
        'opportunities.createModal.paymentDetailsPlaceholder',
      )}
      unpaidOptionLabel={formatMessage('opportunities.createModal.unpaidOption')}
      paidOptionLabel={formatMessage('opportunities.createModal.paidOption')}
      cancelText={formatMessage('opportunities.createModal.cancel')}
      submitText={formatMessage('opportunities.createModal.submit')}
      savingText={formatMessage('opportunities.createModal.saving')}
    />
  );
};
