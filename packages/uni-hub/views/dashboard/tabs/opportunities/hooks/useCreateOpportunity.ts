import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type {
  CreateOpportunityRequest,
  Opportunity,
  UpdateOpportunityRequest,
} from '@core/types/opportunities';
import { OPPORTUNITY_PAYMENT_TYPE } from '@core/constants/opportunities';
import { invalidateOpportunities } from '../cache';
import type { CreateOpportunityFormData } from '../types';

const INITIAL_FORM_DATA: CreateOpportunityFormData = {
  title: '',
  description: '',
  ownerContactInfo: '',
  paymentType: OPPORTUNITY_PAYMENT_TYPE.UNPAID,
  paymentDetails: '',
};

interface OpportunityUpdate {
  id: string;
  request: UpdateOpportunityRequest;
}

export interface UseCreateOpportunityProps {
  onCreated: () => void;
}

interface UseCreateOpportunityResult {
  isOpen: boolean;
  formData: CreateOpportunityFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateOpportunityFormData>>;
  creating: boolean;
  isEdit: boolean;
  openCreate: () => void;
  openEdit: (opportunity: Opportunity) => void;
  close: () => void;
  handleSubmit: (event: React.SyntheticEvent<HTMLFormElement>) => Promise<void>;
}

export function useCreateOpportunity({
  onCreated,
}: UseCreateOpportunityProps): UseCreateOpportunityResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateOpportunityFormData>(INITIAL_FORM_DATA);

  const createMutation = useMutation({
    mutationFn: (request: CreateOpportunityRequest) => opportunitiesApi.createOpportunity(request),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: OpportunityUpdate) =>
      opportunitiesApi.updateOpportunity(id, request),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

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

    try {
      if (editingOpportunityId) {
        await updateMutation.mutateAsync({
          id: editingOpportunityId,
          request: {
            title: formData.title.trim(),
            description: formData.description.trim(),
            ownerContactInfo: formData.ownerContactInfo.trim(),
            paymentType: formData.paymentType,
            paymentDetails:
              (formData.paymentType === OPPORTUNITY_PAYMENT_TYPE.PAID &&
                formData.paymentDetails.trim()) ||
              null,
          },
        });

        toast.success(formatMessage('opportunities.toast.updated'));
        close();
      } else {
        await createMutation.mutateAsync({
          title: formData.title.trim(),
          description: formData.description.trim(),
          ownerContactInfo: formData.ownerContactInfo.trim(),
          paymentType: formData.paymentType,
          paymentDetails: formData.paymentDetails.trim() || undefined,
        });

        toast.success(formatMessage('opportunities.toast.createdDraft'));
        close();
        onCreated();
      }
    } catch (err: unknown) {
      const errorKey = editingOpportunityId
        ? 'opportunities.toast.updateError'
        : 'opportunities.toast.createError';

      toast.error(getErrorMessage(err, formatMessage(errorKey)));
    }
  };

  return {
    isOpen,
    formData,
    setFormData,
    creating: createMutation.isPending || updateMutation.isPending,
    isEdit: editingOpportunityId !== null,
    openCreate,
    openEdit,
    close,
    handleSubmit,
  };
}
