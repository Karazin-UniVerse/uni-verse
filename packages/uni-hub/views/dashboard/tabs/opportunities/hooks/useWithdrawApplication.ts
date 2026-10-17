import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { invalidateOpportunities } from '../cache';

interface UseWithdrawApplicationResult {
  withdrawApplicationId: string | null;
  setWithdrawApplicationId: (applicationId: string | null) => void;
  withdrawing: boolean;
  handleWithdraw: () => Promise<void>;
}

export function useWithdrawApplication(): UseWithdrawApplicationResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [withdrawApplicationId, setWithdrawApplicationId] = useState<string | null>(null);

  const withdrawMutation = useMutation({
    mutationFn: (applicationId: string) => opportunitiesApi.withdrawApplication(applicationId),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const handleWithdraw = async (): Promise<void> => {
    if (!withdrawApplicationId) return;

    try {
      await withdrawMutation.mutateAsync(withdrawApplicationId);
      toast.success(formatMessage('opportunities.toast.withdrawn'));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    } finally {
      setWithdrawApplicationId(null);
    }
  };

  return {
    withdrawApplicationId,
    setWithdrawApplicationId,
    withdrawing: withdrawMutation.isPending,
    handleWithdraw,
  };
}
