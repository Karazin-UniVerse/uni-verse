import React, { useState } from 'react';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import { OPPORTUNITY_STATUS, type OpportunityLifecycle } from '@core/constants/opportunities';

export interface UseOpportunityDetailResult {
  selectedOpportunity: Opportunity | null;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  open: (opportunity: Opportunity) => void;
  handleSendToReview: (id: string) => Promise<void>;
  handleLifecycleChange: (id: string, state: OpportunityLifecycle) => Promise<void>;
}

export function useOpportunityDetail(
  onOpportunityUpdated?: (id: string, patch: Partial<Opportunity>) => Promise<void> | void,
): UseOpportunityDetailResult {
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
      await opportunitiesApi.changeStatus(id, OPPORTUNITY_STATUS.READY_FOR_REVIEW);
      toast.success(formatMessage('opportunities.toast.sentToReview'));
      patchSelected(id, { status: OPPORTUNITY_STATUS.READY_FOR_REVIEW });
      void onOpportunityUpdated?.(id, { status: OPPORTUNITY_STATUS.READY_FOR_REVIEW });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    }
  };

  const handleLifecycleChange = async (id: string, state: OpportunityLifecycle): Promise<void> => {
    try {
      await opportunitiesApi.changeLifecycle(id, state);
      toast.success(formatMessage('opportunities.toast.stateUpdated'));
      patchSelected(id, { lifecycleState: state });
      void onOpportunityUpdated?.(id, { lifecycleState: state });
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
