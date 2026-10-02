'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button, useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { authApi, getErrorMessage } from '@uni-hub/services/api';
import styles from './UnlinkMoodleModal.module.scss';

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
    <Modal
      open={open}
      onClose={onClose}
      title={formatMessage('login.unlinkMoodleTitle')}
      closeLabel={formatMessage('modal.close')}
      width={420}
    >
      <div className={styles.modalContent}>
        <div className={styles.warningBox}>
          <AlertTriangle size={20} className={styles.warningIcon} aria-hidden />
          <p className={styles.warningText}>{formatMessage('login.unlinkMoodlePrompt')}</p>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {formatMessage('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            className={styles.dangerBtn}
            onClick={handleUnlink}
            disabled={loading}
          >
            {loading
              ? formatMessage('login.unlinkMoodleLoading')
              : formatMessage('login.unlinkMoodleConfirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UnlinkMoodleModal;
