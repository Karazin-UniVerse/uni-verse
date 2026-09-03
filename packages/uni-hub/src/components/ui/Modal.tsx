import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.scss';

let activeModalCount = 0;
let previousBodyOverflow = '';

function lockScroll() {
  if (typeof document === 'undefined') {
    return;
  }

  if (activeModalCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  activeModalCount += 1;
}

function unlockScroll() {
  if (typeof document === 'undefined') {
    return;
  }

  activeModalCount = Math.max(0, activeModalCount - 1);

  if (activeModalCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

type ModalProps = {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  ariaLabel?: string;
  className?: string;
  title?: React.ReactNode;
  width?: number | string;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  children,
  onClose,
  open,
  ariaLabel,
  className,
  title,
  width = 700,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    lockScroll();

    const dialogElement = dialogRef.current;

    if (dialogElement) {
      const focusableElements = dialogElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const firstFocusableElement = focusableElements[0] || dialogElement;

      firstFocusableElement.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockScroll();

      if (previouslyFocusedElementRef.current && previouslyFocusedElementRef.current.focus) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const dialogAriaLabel = title ? undefined : ariaLabel || 'Діалогове вікно';

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${className ?? ''}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={dialogAriaLabel}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          {title && (
            <h3 id={titleId} className={styles.title}>
              {title}
            </h3>
          )}
          <button
            type="button"
            className={styles.closeBtn ?? ''}
            onClick={onClose}
            aria-label="Закрити"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};
