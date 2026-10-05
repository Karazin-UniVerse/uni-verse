import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import type { ModalProps } from './Modal.types';
import { useModal } from './useModal';
import styles from './Modal.module.scss';

export const Modal: React.FC<ModalProps> = ({
  children,
  onClose,
  open,
  ariaLabel,
  className,
  closeLabel,
  title,
  width = 700,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useModal({
    open,
    onClose,
    dialogRef,
    overlayRef,
    lockScroll: true,
    closeOnEscape: true,
    trapFocus: true,
    restoreFocus: true,
  });

  if (!open) {
    return null;
  }

  const dialogAriaLabel = title ? undefined : ariaLabel || 'Dialog';

  return (
    <div ref={overlayRef} className={styles.overlay}>
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${className ?? ''}`}
        style={
          {
            '--modal-dialog-width': typeof width === 'number' ? `${width}px` : width,
          } as React.CSSProperties
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={dialogAriaLabel}
        tabIndex={-1}
      >
        <div className={styles.header}>
          {title && (
            <h3 id={titleId} className={styles.title}>
              {title}
            </h3>
          )}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={closeLabel ?? 'Close'}
            title={closeLabel ?? 'Close'}
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
