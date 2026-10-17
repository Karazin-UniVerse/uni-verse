import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import { OPPORTUNITY_STATUS, type OpportunityLifecycle } from '@core/constants/opportunities';
import { invalidateOpportunities } from '../cache';

interface LifecycleChange {
  id: string;
  state: OpportunityLifecycle;
}

interface UseOpportunityDetailResult {
  selectedOpportunity: Opportunity | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  open: (opportunity: Opportunity) => void;
  handleSendToReview: (id: string) => Promise<void>;
  handleLifecycleChange: (id: string, state: OpportunityLifecycle) => Promise<void>;
}

export function useOpportunityDetail(): UseOpportunityDetailResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const sendToReviewMutation = useMutation({
    mutationFn: (id: string) =>
      opportunitiesApi.changeStatus(id, OPPORTUNITY_STATUS.READY_FOR_REVIEW),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ id, state }: LifecycleChange) => opportunitiesApi.changeLifecycle(id, state),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const open = (opportunity: Opportunity): void => {
    setSelectedOpportunity(opportunity);
    setIsOpen(true);
  };

  const patchSelected = (id: string, patch: Partial<Opportunity>): void => {
    setSelectedOpportunity((current) => (current?.id === id ? { ...current, ...patch } : current));
  };

  const handleSendToReview = async (id: string): Promise<void> => {
    try {
      await sendToReviewMutation.mutateAsync(id);
      toast.success(formatMessage('opportunities.toast.sentToReview'));
      patchSelected(id, { status: OPPORTUNITY_STATUS.READY_FOR_REVIEW });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    }
  };

  const handleLifecycleChange = async (id: string, state: OpportunityLifecycle): Promise<void> => {
    try {
      await lifecycleMutation.mutateAsync({ id, state });
      toast.success(formatMessage('opportunities.toast.stateUpdated'));
      patchSelected(id, { lifecycleState: state });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    }
  };

  return {
    selectedOpportunity,
    isOpen,
    setIsOpen,
    open,
    handleSendToReview,
    handleLifecycleChange,
  };
}
