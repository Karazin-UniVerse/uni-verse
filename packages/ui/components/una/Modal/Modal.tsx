import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useScrollLock } from '../../../hooks/useScrollLock';
import type { ModalProps } from './Modal.types';
import styles from './Modal.module.scss';

export const Modal: React.FC<ModalProps> = ({
  children,
  onClose,
  open,
  ariaLabel,
  className,
  closeLabel,
  title,
  closeButton = true,
  closeOnClickOutside = true,
  closeOnEscape = true,
  lockScroll = true,
  restoreFocus = true,
  trapFocus = true,
  width = 700,
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useClickOutside(dialogRef, onClose, {
    enabled: open && closeOnClickOutside,
  });

  useEscapeKey(onClose, {
    enabled: open && closeOnEscape,
  });

  useScrollLock(open && lockScroll);

  useFocusTrap(dialogRef, {
    enabled: open && trapFocus,
    restoreFocus,
  });

  if (!open) {
    return null;
  }

  const dialogAriaLabel = title ? undefined : ariaLabel;

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} aria-hidden="true" />
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
        {(title || closeButton) && (
          <div className={styles.header}>
            {title && (
              <h3 id={titleId} className={styles.title}>
                {title}
              </h3>
            )}
            {closeButton && (
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label={closeLabel}
                title={closeLabel}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
