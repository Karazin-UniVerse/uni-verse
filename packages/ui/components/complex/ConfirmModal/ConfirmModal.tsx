import React from 'react';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../../una';
import styles from './ConfirmModal.module.scss';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  message: React.ReactNode;
  cancelLabel: React.ReactNode;
  confirmLabel: React.ReactNode;
  closeLabel?: string;
  loading?: boolean;
  loadingLabel?: React.ReactNode;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: React.ReactNode;
  width?: number | string;
  className?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  cancelLabel,
  confirmLabel,
  closeLabel,
  loadingLabel,
  icon,
  className,
  loading = false,
  variant = 'danger',
  width = 420,
}) => {
  const defaultIcon = icon ?? (
    <AlertTriangle
      size={20}
      className={clsx(
        styles.icon,
        variant === 'danger' && styles.dangerIcon,
        variant === 'warning' && styles.warningIcon,
      )}
      aria-hidden
    />
  );

  return (
    <Modal open={open} onClose={onClose} title={title} closeLabel={closeLabel} width={width}>
      <div className={clsx(styles.modalContent, className)}>
        <div className={styles.messageBox}>
          {defaultIcon}
          <p className={styles.messageText}>{message}</p>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            className={clsx(variant === 'danger' && styles.dangerBtn)}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (loadingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
