import React, { useState } from 'react';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import type { OpportunityModerateAction } from '@core/constants/opportunities';
import type { RejectModalState } from './types';

const CLOSED_REJECT_MODAL: RejectModalState = { open: false, id: null, comment: '' };

const SUCCESS_MESSAGE_KEYS = {
  APPROVE: 'opportunities.toast.approved',
  REJECT: 'opportunities.toast.rejected',
  REQUIRE_CHANGES: 'opportunities.toast.requiresChanges',
} as const;

export function useModeration(
  setQueue: React.Dispatch<React.SetStateAction<Opportunity[]>>,
  onModerated?: () => void,
) {
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const [rejectModal, setRejectModal] = useState<RejectModalState>(CLOSED_REJECT_MODAL);
  const [submitting, setSubmitting] = useState(false);

  const openRejectModal = (id: string): void => setRejectModal({ open: true, id, comment: '' });

  const closeRejectModal = (): void => setRejectModal(CLOSED_REJECT_MODAL);

  const changeRejectComment = (comment: string): void =>
    setRejectModal((current) => ({ ...current, comment }));

  const handleModerate = async (
    id: string,
    action: OpportunityModerateAction,
    comment?: string,
  ): Promise<boolean> => {
    try {
      await opportunitiesApi.moderate(id, action, comment);
      setQueue((current) => current.filter((item) => item.id !== id));
      toast.success(formatMessage(SUCCESS_MESSAGE_KEYS[action]));
      onModerated?.();

      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.moderateError')));

      return false;
    }
  };

  const handleRejectConfirm = async (
    id: string,
    action: OpportunityModerateAction,
    comment: string,
  ): Promise<void> => {
    setSubmitting(true);

    try {
      if (await handleModerate(id, action, comment)) {
        closeRejectModal();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return {
    rejectModal,
    submitting,
    openRejectModal,
    closeRejectModal,
    changeRejectComment,
    handleModerate,
    handleRejectConfirm,
  };
}
