import React from 'react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '../../OpportunitiesTab.module.scss';

interface ModerationActionsProps {
  onApprove: () => void;
  onOpenRejectModal: () => void;
  disabled?: boolean;
}

export const ModerationActions: React.FC<ModerationActionsProps> = ({
  onApprove,
  onOpenRejectModal,
  disabled = false,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.moderationActions}>
      <Button
        variant="primary"
        className={styles.approveBtn}
        disabled={disabled}
        onClick={onApprove}
      >
        <CheckCircle2 size={14} aria-hidden="true" className={styles.btnIcon} />
        {formatMessage('opportunities.moderation.approve')}
      </Button>
      <Button
        variant="secondary"
        className={styles.reviseBtn}
        disabled={disabled}
        onClick={onOpenRejectModal}
      >
        <AlertCircle size={14} aria-hidden="true" className={styles.btnIcon} />
        {formatMessage('opportunities.moderation.revise')}
      </Button>
      <Button
        variant="secondary"
        className={styles.rejectBtn}
        disabled={disabled}
        onClick={onOpenRejectModal}
      >
        <XCircle size={14} aria-hidden="true" className={styles.btnIcon} />
        {formatMessage('opportunities.moderation.reject')}
      </Button>
    </div>
  );
};
