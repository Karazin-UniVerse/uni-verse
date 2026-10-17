import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { isValidContactInfo } from '@core/utils/contacts';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { ApplyOpportunityRequest, Opportunity } from '@core/types/opportunities';
import type { CurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { invalidateOpportunities } from '../cache';

interface ApplicationSubmission {
  opportunityId: string;
  request: ApplyOpportunityRequest;
}

export interface UseApplicantActionsProps {
  currentUser: CurrentUser;
  selectedOpportunity: Opportunity | null;
}

interface UseApplicantActionsResult {
  isApplyOpen: boolean;
  setIsApplyOpen: (isOpen: boolean) => void;
  motivation: string;
  setMotivation: (motivation: string) => void;
  contactInfo: string;
  setContactInfo: (contactInfo: string) => void;
  applying: boolean;
  handleApplySubmit: (event: React.SyntheticEvent<HTMLFormElement>) => Promise<void>;
  withdrawApplicationId: string | null;
  setWithdrawApplicationId: (applicationId: string | null) => void;
  withdrawing: boolean;
  handleWithdraw: () => Promise<void>;
}

export function useApplicantActions({
  currentUser,
  selectedOpportunity,
}: UseApplicantActionsProps): UseApplicantActionsResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [withdrawApplicationId, setWithdrawApplicationId] = useState<string | null>(null);

  const applyMutation = useMutation({
    mutationFn: ({ opportunityId, request }: ApplicationSubmission) =>
      opportunitiesApi.apply(opportunityId, request),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const withdrawMutation = useMutation({
    mutationFn: (applicationId: string) => opportunitiesApi.withdrawApplication(applicationId),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const handleApplySubmit = async (event: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!selectedOpportunity) return;

    if (!isValidContactInfo(contactInfo)) {
      toast.error(formatMessage('opportunities.applyModal.invalidContact'));

      return;
    }

    try {
      await applyMutation.mutateAsync({
        opportunityId: selectedOpportunity.id,
        request: {
          applicantName:
            currentUser.name ||
            currentUser.email ||
            formatMessage('opportunities.applyModal.defaultApplicantName'),
          contactInfo: contactInfo.trim(),
          motivation: motivation.trim(),
        },
      });

      setIsApplyOpen(false);
      setMotivation('');
      setContactInfo('');
      toast.success(formatMessage('opportunities.toast.applySuccess'));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.applyError')));
    }
  };

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
    isApplyOpen,
    setIsApplyOpen,
    motivation,
    setMotivation,
    contactInfo,
    setContactInfo,
    applying: applyMutation.isPending,
    handleApplySubmit,
    withdrawApplicationId,
    setWithdrawApplicationId,
    withdrawing: withdrawMutation.isPending,
    handleWithdraw,
  };
}
