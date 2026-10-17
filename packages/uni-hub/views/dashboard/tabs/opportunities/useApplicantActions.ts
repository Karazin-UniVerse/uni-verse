import React, { useState } from 'react';
import { useToast } from '@una';
import { isValidContactInfo } from '@core/utils/contacts';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OPPORTUNITY_APP_STATUS } from '@core/constants/opportunities';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import type { CurrentUser } from '@uni-hub/hooks/useCurrentUser';

export interface UseApplicantActionsProps {
  currentUser: CurrentUser;
  selectedOpportunity: Opportunity | null;
  setApplications: React.Dispatch<React.SetStateAction<OpportunityApplication[]>>;
}

export interface UseApplicantActionsResult {
  isApplyOpen: boolean;
  setIsApplyOpen: React.Dispatch<React.SetStateAction<boolean>>;
  motivation: string;
  setMotivation: React.Dispatch<React.SetStateAction<string>>;
  contactInfo: string;
  setContactInfo: React.Dispatch<React.SetStateAction<string>>;
  applying: boolean;
  handleApplySubmit: (event: React.SyntheticEvent<HTMLFormElement>) => Promise<void>;
  withdrawApplicationId: string | null;
  setWithdrawApplicationId: React.Dispatch<React.SetStateAction<string | null>>;
  withdrawing: boolean;
  handleWithdraw: () => Promise<void>;
}

export function useApplicantActions({
  currentUser,
  selectedOpportunity,
  setApplications,
}: UseApplicantActionsProps): UseApplicantActionsResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [applying, setApplying] = useState(false);

  const [withdrawApplicationId, setWithdrawApplicationId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const handleApplySubmit = async (event: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!selectedOpportunity) return;

    if (!isValidContactInfo(contactInfo)) {
      toast.error(formatMessage('opportunities.applyModal.invalidContact'));

      return;
    }

    setApplying(true);

    try {
      await opportunitiesApi.apply(selectedOpportunity.id, {
        applicantName:
          currentUser.name ||
          currentUser.email ||
          formatMessage('opportunities.applyModal.defaultApplicantName'),
        contactInfo: contactInfo.trim(),
        motivation: motivation.trim(),
      });

      setIsApplyOpen(false);
      setMotivation('');
      setContactInfo('');
      toast.success(formatMessage('opportunities.toast.applySuccess'));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.applyError')));
    } finally {
      setApplying(false);
    }
  };

  const handleWithdraw = async (): Promise<void> => {
    if (!withdrawApplicationId) return;

    setWithdrawing(true);

    try {
      await opportunitiesApi.withdrawApplication(withdrawApplicationId);
      setApplications((current) =>
        current.map((application) =>
          application.id === withdrawApplicationId
            ? { ...application, status: OPPORTUNITY_APP_STATUS.WITHDRAWN }
            : application,
        ),
      );
      toast.success(formatMessage('opportunities.toast.withdrawn'));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    } finally {
      setWithdrawing(false);
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
    applying,
    handleApplySubmit,
    withdrawApplicationId,
    setWithdrawApplicationId,
    withdrawing,
    handleWithdraw,
  };
}
