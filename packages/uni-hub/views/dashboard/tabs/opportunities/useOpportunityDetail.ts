import { useState } from 'react';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity, OpportunityLifecycle } from '@uni-hub/types';

export function useOpportunityDetail(refetchMyOpportunities: () => Promise<void>) {
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = (opportunity: Opportunity): void => {
    setSelectedOpportunity(opportunity);
    setIsOpen(true);
  };

  const patchSelected = (id: string, patch: Partial<Opportunity>): void => {
    setSelectedOpportunity((current) => (current?.id === id ? { ...current, ...patch } : current));
  };

  const handleSendToReview = async (id: string): Promise<void> => {
    try {
      await opportunitiesApi.changeStatus(id, 'READY_FOR_REVIEW');
      toast.success(formatMessage('opportunities.toast.sentToReview'));
      void refetchMyOpportunities();
      patchSelected(id, { status: 'READY_FOR_REVIEW' });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    }
  };

  const handleLifecycleChange = async (id: string, state: OpportunityLifecycle): Promise<void> => {
    try {
      await opportunitiesApi.changeLifecycle(id, state);
      toast.success(formatMessage('opportunities.toast.stateUpdated'));
      void refetchMyOpportunities();
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
