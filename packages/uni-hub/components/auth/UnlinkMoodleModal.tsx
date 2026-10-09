'use client';

import React, { useState } from 'react';
import { ConfirmModal } from '@universe/ui';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { authApi, getErrorMessage } from '@uni-hub/services/api';

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
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleUnlink = async () => {
    setLoading(true);

    try {
      await authApi.unlinkMoodleAccount();

      toast.success(formatMessage('login.unlinkMoodleSuccess'));
      onSuccess();
    } catch (err: unknown) {
      const message = getErrorMessage(err, formatMessage('login.unlinkMoodleError'));

      toast.error(message);
    } finally {
      setLoading(false);
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
      loading={loading}
      closeLabel={formatMessage('modal.close')}
      variant="danger"
    />
  );
};

export default UnlinkMoodleModal;
