import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OPPORTUNITY_STATUS } from '@core/constants/opportunities';
import { invalidateOpportunities } from '../cache';
import { getOpportunityErrorMessage } from '../helpers';

interface UseOpportunityActionsResult {
  handleDeleteOpportunity: (id: string) => Promise<boolean>;
  handleSendToReview: (id: string) => Promise<void>;
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => opportunitiesApi.deleteOpportunity(id),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const handleSendToReview = async (id: string): Promise<void> => {
    try {
      await sendToReviewMutation.mutateAsync(id);
      toast.success(formatMessage('opportunities.toast.sentToReview'));
    } catch (err: unknown) {
      toast.error(
        getOpportunityErrorMessage(
          err,
          formatMessage,
          formatMessage('opportunities.toast.genericError'),
        ),
      );
    }
  };

  const handleDeleteOpportunity = async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(formatMessage('opportunities.toast.deleted'));

      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.deleteError')));

      return false;
    }
  };

  return {
    handleSendToReview,
    handleDeleteOpportunity,
  };
}
