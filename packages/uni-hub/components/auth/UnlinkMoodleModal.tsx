'use client';

import React from 'react';
import { ConfirmModal } from '@ui';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { getErrorMessage } from '@uni-hub/services/api';
import { useUnlinkMoodle } from '@uni-hub/hooks/useAuthMutations';

export interface UnlinkMoodleModalProps {
  onClose: () => void;
  onSuccess: () => void;
  open: boolean;
}

export const UnlinkMoodleModal: React.FC<UnlinkMoodleModalProps> = ({
  onClose,
  onSuccess,
  open,
}) => {
  const { formatMessage } = useLanguage();
  const unlinkMoodle = useUnlinkMoodle();
  const toast = useToast();

  const handleUnlink = async (): Promise<void> => {
    try {
      await unlinkMoodle.mutateAsync();

      toast.success(formatMessage('login.unlinkMoodleSuccess'));
      onSuccess();
    } catch (err: unknown) {
      const message = getErrorMessage(err, formatMessage('login.unlinkMoodleError'));

      toast.error(message);
    }
  };

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={handleUnlink}
      title={formatMessage('login.unlinkMoodleTitle')}
      message={formatMessage('login.unlinkMoodlePrompt')}
      cancelLabel={formatMessage('common.cancel')}
      confirmLabel={formatMessage('login.unlinkMoodleConfirm')}
      loadingLabel={formatMessage('login.unlinkMoodleLoading')}
      loading={unlinkMoodle.isPending}
      closeLabel={formatMessage('modal.close')}
      variant="danger"
    />
  );
};

export default UnlinkMoodleModal;
