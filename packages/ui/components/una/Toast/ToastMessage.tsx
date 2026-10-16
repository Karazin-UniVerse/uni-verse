import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import styles from './Toast.module.scss';

import type { ToastItem, ToastKind } from './Toast.types';

export interface ToastMessageProps extends Pick<ToastItem, 'kind' | 'text'> {
  onDismiss?: () => void;
  onClose?: () => void;
}

const ICONS: Record<ToastKind, React.ComponentType<{ size?: number; className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

export const ToastMessage: React.FC<ToastMessageProps> = ({ kind, text, onDismiss, onClose }) => {
  const Icon = ICONS[kind];
  const handleClose = onDismiss || onClose;

  return (
    <div className={`${styles.toast} ${styles[kind] ?? ''}`} data-variant={kind} data-kind={kind}>
      {Icon && <Icon size={16} className={styles.icon} data-testid={`toast-icon-${kind}`} />}
      <span className={styles.text}>{text}</span>
      {handleClose && (
        <button
          type="button"
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default ToastMessage;
