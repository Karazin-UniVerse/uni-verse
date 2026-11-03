import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type {
  CreateOpportunityRequest,
  Opportunity,
  UpdateOpportunityRequest,
} from '@core/types/opportunities';
import {
  OPPORTUNITY_LIFECYCLE,
  OPPORTUNITY_PAYMENT_TYPE,
  OPPORTUNITY_STATUS,
} from '@core/constants/opportunities';
import {
  getOpportunityTagNames,
  hasOpportunityContentChanged,
  isRecruitmentPhase,
} from '@core/utils/opportunities';
import { invalidateOpportunities } from '../cache';
import type { CreateOpportunityFormData } from '../types';
import { getOpportunityErrorMessage } from '../helpers';

const INITIAL_FORM_DATA: CreateOpportunityFormData = {
  title: '',
  description: '',
  ownerContactInfo: '',
  paymentType: OPPORTUNITY_PAYMENT_TYPE.UNPAID,
  paymentDetails: '',
  tags: [],
  acceptsApplications: false,
  lifecycleState: OPPORTUNITY_LIFECYCLE.START,
};

interface OpportunityUpdate {
  id: string;
  request: UpdateOpportunityRequest;
}

export interface UseCreateOpportunityProps {
  currentOpportunity?: Opportunity;
  onCreated?: () => void;
}

interface UseCreateOpportunityResult {
  isOpen: boolean;
  formData: CreateOpportunityFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateOpportunityFormData>>;
  creating: boolean;
  isEdit: boolean;
  willRemoderate: boolean;
  openCreate: () => void;
  openEdit: (opportunity: Opportunity) => void;
  close: () => void;
  handleSubmit: (event: React.SyntheticEvent<HTMLFormElement>) => Promise<void>;
}

export function useCreateOpportunity({
  currentOpportunity,
  onCreated,
}: UseCreateOpportunityProps): UseCreateOpportunityResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
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
    setEditingOpportunity(null);
    setFormData(INITIAL_FORM_DATA);
    setIsOpen(true);
  };

  const openEdit = (opportunity: Opportunity): void => {
    const canAcceptApplications = isRecruitmentPhase(opportunity.lifecycleState);

    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title,
      description: opportunity.description,
      ownerContactInfo: opportunity.ownerContactInfo || '',
      paymentType: opportunity.paymentType,
      paymentDetails: opportunity.paymentDetails || '',
      tags: getOpportunityTagNames(opportunity),
      acceptsApplications: canAcceptApplications && opportunity.acceptsApplications !== false,
      lifecycleState: opportunity.lifecycleState,
    });
    setIsOpen(true);
  };

  const close = (): void => {
    setIsOpen(false);
    setEditingOpportunity(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const canAcceptApplications = isRecruitmentPhase(formData.lifecycleState);

    try {
      if (editingOpportunity) {
        await updateMutation.mutateAsync({
          id: editingOpportunity.id,
          request: {
            title: formData.title.trim(),
            description: formData.description.trim(),
            ownerContactInfo: formData.ownerContactInfo.trim(),
            paymentType: formData.paymentType,
            paymentDetails:
              (formData.paymentType === OPPORTUNITY_PAYMENT_TYPE.PAID &&
                formData.paymentDetails.trim()) ||
              null,
            tags: formData.tags,
            acceptsApplications: canAcceptApplications ? formData.acceptsApplications : false,
            lifecycleState: formData.lifecycleState,
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
          tags: formData.tags,
          acceptsApplications: canAcceptApplications
            ? (formData.acceptsApplications ?? true)
            : false,
          lifecycleState: formData.lifecycleState,
        });

        toast.success(formatMessage('opportunities.toast.createdDraft'));
        close();
        onCreated?.();
      }
    } catch (err: unknown) {
      const errorKey = editingOpportunity
        ? 'opportunities.toast.updateError'
        : 'opportunities.toast.createError';

      toast.error(getOpportunityErrorMessage(err, formatMessage, formatMessage(errorKey)));
    }
  };

  const baselineOpportunity =
    editingOpportunity && currentOpportunity?.id === editingOpportunity.id
      ? currentOpportunity
      : editingOpportunity;

  const willRemoderate =
    baselineOpportunity?.status === OPPORTUNITY_STATUS.PUBLISHED &&
    hasOpportunityContentChanged(baselineOpportunity, formData);

  return {
    isOpen,
    formData,
    setFormData,
    creating: createMutation.isPending || updateMutation.isPending,
    isEdit: editingOpportunity !== null,
    willRemoderate,
    openCreate,
    openEdit,
    close,
    handleSubmit,
  };
}
