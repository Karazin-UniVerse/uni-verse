import React, { useState } from 'react';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { CreateOpportunityFormData } from './types';

const INITIAL_FORM_DATA: CreateOpportunityFormData = {
  title: '',
  description: '',
  ownerContactInfo: '',
  paymentType: 'UNPAID',
  paymentDetails: '',
};

export interface UseCreateOpportunityProps {
  onCreated: () => void;
}

export function useCreateOpportunity({ onCreated }: UseCreateOpportunityProps) {
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateOpportunityFormData>(INITIAL_FORM_DATA);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setCreating(true);

    try {
      await opportunitiesApi.createOpportunity({
        title: formData.title.trim(),
        description: formData.description.trim(),
        ownerContactInfo: formData.ownerContactInfo.trim(),
        paymentType: formData.paymentType,
        paymentDetails: formData.paymentDetails.trim() || undefined,
      });

      setIsOpen(false);
      setFormData(INITIAL_FORM_DATA);
      toast.success(formatMessage('opportunities.toast.createdDraft'));
      onCreated();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.createError')));
    } finally {
      setCreating(false);
    }
  };

  return { isOpen, setIsOpen, formData, setFormData, creating, handleSubmit };
}
