import React from 'react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@una';
import type { ModerationActionsProps } from './ModerationActions.types';
import styles from './ModerationActions.module.scss';

export const ModerationActions: React.FC<ModerationActionsProps> = ({
  onApprove,
  onOpenRejectModal,
  approveText,
  reviseText,
  rejectText,
  disabled = false,
}) => {
  return (
    <div className={styles.moderationActions}>
      <Button
        variant="primary"
        className={styles.approveBtn}
        disabled={disabled}
        onClick={onApprove}
      >
        <CheckCircle2 size={14} aria-hidden="true" className={styles.btnIcon} />
        {approveText}
      </Button>
      <Button
        variant="secondary"
        className={styles.reviseBtn}
        disabled={disabled}
        onClick={onOpenRejectModal}
      >
        <AlertCircle size={14} aria-hidden="true" className={styles.btnIcon} />
        {reviseText}
      </Button>
      <Button
        variant="secondary"
        className={styles.rejectBtn}
        disabled={disabled}
        onClick={onOpenRejectModal}
      >
        <XCircle size={14} aria-hidden="true" className={styles.btnIcon} />
        {rejectText}
      </Button>
    </div>
  );
};
