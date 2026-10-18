import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OPPORTUNITY_STATUS, type OpportunityLifecycle } from '@core/constants/opportunities';
import { invalidateOpportunities } from '../cache';

interface LifecycleChange {
  id: string;
  state: OpportunityLifecycle;
}

interface UseOpportunityActionsResult {
  handleSendToReview: (id: string) => Promise<void>;
  handleLifecycleChange: (id: string, state: OpportunityLifecycle) => Promise<void>;
}

export function useOpportunityActions(): UseOpportunityActionsResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const sendToReviewMutation = useMutation({
    mutationFn: (id: string) =>
      opportunitiesApi.changeStatus(id, OPPORTUNITY_STATUS.READY_FOR_REVIEW),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ id, state }: LifecycleChange) => opportunitiesApi.changeLifecycle(id, state),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const handleSendToReview = async (id: string): Promise<void> => {
    try {
      await sendToReviewMutation.mutateAsync(id);
      toast.success(formatMessage('opportunities.toast.sentToReview'));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    }
  };

  const handleLifecycleChange = async (id: string, state: OpportunityLifecycle): Promise<void> => {
    try {
      await lifecycleMutation.mutateAsync({ id, state });
      toast.success(formatMessage('opportunities.toast.stateUpdated'));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    }
  };

  return {
    handleSendToReview,
    handleLifecycleChange,
  };
}
