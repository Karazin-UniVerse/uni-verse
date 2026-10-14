import React, { useState } from 'react';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@uni-hub/types';
import type { CreateOpportunityFormData } from './types';

const INITIAL_FORM_DATA: CreateOpportunityFormData = {
  title: '',
  description: '',
  ownerContactInfo: '',
  paymentType: 'UNPAID',
  paymentDetails: '',
};

export interface UseCreateOpportunityProps {
  onCreated?: () => void;
  onUpdated?: () => void;
}

export function useCreateOpportunity({ onCreated, onUpdated }: UseCreateOpportunityProps) {
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateOpportunityFormData>(INITIAL_FORM_DATA);
  const [creating, setCreating] = useState(false);

  const openCreate = (): void => {
    setEditingOpportunityId(null);
    setFormData(INITIAL_FORM_DATA);
    setIsOpen(true);
  };

  const openEdit = (opportunity: Opportunity): void => {
    setEditingOpportunityId(opportunity.id);
    setFormData({
      title: opportunity.title,
      description: opportunity.description,
      ownerContactInfo: opportunity.ownerContactInfo || '',
      paymentType: opportunity.paymentType,
      paymentDetails: opportunity.paymentDetails || '',
    });
    setIsOpen(true);
  };

  const close = (): void => {
    setIsOpen(false);
    setEditingOpportunityId(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setCreating(true);

    try {
      if (editingOpportunityId) {
        await opportunitiesApi.updateOpportunity(editingOpportunityId, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          ownerContactInfo: formData.ownerContactInfo.trim(),
          paymentType: formData.paymentType,
          paymentDetails: formData.paymentDetails.trim() || undefined,
        });

        toast.success(formatMessage('opportunities.toast.updated'));
        close();
        onUpdated?.();
      } else {
        await opportunitiesApi.createOpportunity({
          title: formData.title.trim(),
          description: formData.description.trim(),
          ownerContactInfo: formData.ownerContactInfo.trim(),
          paymentType: formData.paymentType,
          paymentDetails: formData.paymentDetails.trim() || undefined,
        });

        toast.success(formatMessage('opportunities.toast.createdDraft'));
        close();
        onCreated?.();
      }
    } catch (err: unknown) {
      const errorKey = editingOpportunityId
        ? 'opportunities.toast.updateError'
        : 'opportunities.toast.createError';

      toast.error(getErrorMessage(err, formatMessage(errorKey)));
    } finally {
      setCreating(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    formData,
    setFormData,
    creating,
    isEdit: editingOpportunityId !== null,
    openCreate,
    openEdit,
    close,
    handleSubmit,
  };
}
