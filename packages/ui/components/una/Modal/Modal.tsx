import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import type { ModalProps } from './Modal.types';
import styles from './Modal.module.scss';

const modalStack: string[] = [];
let previousBodyOverflow = '';

function lockScroll(id: string) {
  if (typeof document === 'undefined') {
    return;
  }

  if (modalStack.length === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  modalStack.push(id);
}

function unlockScroll(id: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const index = modalStack.lastIndexOf(id);

  if (index !== -1) {
    modalStack.splice(index, 1);
  }

  if (modalStack.length === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function handleFocusTrap(event: KeyboardEvent, container: HTMLElement | null): void {
  if (event.key !== 'Tab' || !container) {
    return;
  }

  const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

  if (focusableElements.length === 0) {
    event.preventDefault();

    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    lastElement.focus();
    event.preventDefault();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    firstElement.focus();
    event.preventDefault();
  }
}

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
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const modalId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    lockScroll(modalId);

    const dialogElement = dialogRef.current;

    if (dialogElement) {
      const focusableElements = dialogElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const firstFocusableElement = focusableElements[0] || dialogElement;

      firstFocusableElement.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const isTopmost = modalStack.at(-1) === modalId;

        if (isTopmost) {
          event.stopPropagation();
          onCloseRef.current();
        }

        return;
      }

      handleFocusTrap(event, dialogRef.current);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockScroll(modalId);

      previouslyFocusedElementRef.current?.focus?.();
    };
  }, [open, modalId]);

  if (!open) {
    return null;
  }

  const dialogAriaLabel = title ? undefined : ariaLabel || 'Діалогове вікно';

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${className ?? ''}`}
        style={{ width }}
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

export default Modal;
