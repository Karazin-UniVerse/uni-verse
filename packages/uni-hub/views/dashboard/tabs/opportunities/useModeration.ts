import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { OpportunityModerateAction } from '@core/constants/opportunities';
import {
  invalidateOpportunities,
  isLastPendingModeration,
  removeFromModerationQueue,
  restoreModerationQueue,
} from './cache';
import { moderateMutationKey } from './queryKeys';
import type { RejectModalState } from './types';

const CLOSED_REJECT_MODAL: RejectModalState = { open: false, id: null, comment: '' };

const SUCCESS_MESSAGE_KEYS = {
  APPROVE: 'opportunities.toast.approved',
  REJECT: 'opportunities.toast.rejected',
  REQUIRE_CHANGES: 'opportunities.toast.requiresChanges',
} as const;

interface ModerationRequest {
  id: string;
  action: OpportunityModerateAction;
  comment?: string;
}

interface UseModerationResult {
  rejectModal: RejectModalState;
  submitting: boolean;
  openRejectModal: (id: string) => void;
  closeRejectModal: () => void;
  changeRejectComment: (comment: string) => void;
  handleModerate: (
    id: string,
    action: OpportunityModerateAction,
    comment?: string,
  ) => Promise<boolean>;
  handleRejectConfirm: (
    id: string,
    action: OpportunityModerateAction,
    comment: string,
  ) => Promise<void>;
}

export function useModeration(): UseModerationResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [rejectModal, setRejectModal] = useState<RejectModalState>(CLOSED_REJECT_MODAL);

  const moderateMutation = useMutation({
    mutationKey: moderateMutationKey,
    mutationFn: ({ id, action, comment }: ModerationRequest) =>
      opportunitiesApi.moderate(id, action, comment),
    onMutate: ({ id }) => removeFromModerationQueue(queryClient, id),
    onError: (_error, _request, previousQueue) => {
      if (isLastPendingModeration(queryClient)) {
        restoreModerationQueue(queryClient, previousQueue);
      }
    },
    onSettled: () => {
      if (isLastPendingModeration(queryClient)) {
        return invalidateOpportunities(queryClient);
      }
    },
  });

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
      await moderateMutation.mutateAsync({ id, action, comment });
      toast.success(formatMessage(SUCCESS_MESSAGE_KEYS[action]));

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
    if (await handleModerate(id, action, comment)) {
      closeRejectModal();
    }
  };

  return {
    rejectModal,
    submitting: moderateMutation.isPending,
    openRejectModal,
    closeRejectModal,
    changeRejectComment,
    handleModerate,
    handleRejectConfirm,
  };
}
