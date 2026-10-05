import React, { useId } from 'react';
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
  closeOnClickOutside = true,
  closeOnEscape = true,
  lockScroll = true,
  restoreFocus = true,
  trapFocus = true,
  width = 700,
}) => {
  const titleId = useId();

  const { dialogRef, handleOverlayClick, handleKeyDown } = useModal({
    open,
    onClose,
    closeOnClickOutside,
    closeOnEscape,
    lockScroll,
    restoreFocus,
    trapFocus,
  });

  if (!open) {
    return null;
  }

  const dialogAriaLabel = title ? undefined : ariaLabel || 'Dialog';

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdrop}
        onClick={handleOverlayClick}
        tabIndex={-1}
        aria-label={closeLabel ?? 'Close'}
      />
      <div
        ref={dialogRef as React.RefObject<HTMLDivElement>}
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
        onKeyDown={handleKeyDown}
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
