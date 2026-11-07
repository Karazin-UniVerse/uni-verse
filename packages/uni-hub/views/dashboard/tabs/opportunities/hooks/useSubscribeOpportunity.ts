import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { invalidateOpportunities } from '../cache';

interface UseSubscribeOpportunityResult {
  handleToggleSubscribe: () => Promise<void>;
  isSubscribeLoading: boolean;
}

export function useSubscribeOpportunity(
  id: string,
  isSubscribed: boolean,
): UseSubscribeOpportunityResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const subscribeMutation = useMutation({
    mutationFn: (subscribe: boolean) =>
      subscribe ? opportunitiesApi.subscribe(id) : opportunitiesApi.unsubscribe(id),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const handleToggleSubscribe = async (): Promise<void> => {
    try {
      await subscribeMutation.mutateAsync(!isSubscribed);
      toast.success(
        formatMessage(
          isSubscribed ? 'opportunities.toast.unsubscribed' : 'opportunities.toast.subscribed',
        ),
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    }
  };

  return {
    handleToggleSubscribe,
    isSubscribeLoading: subscribeMutation.isPending,
  };
}
