import { useEffect, useId, useRef, type RefObject } from 'react';

export interface UseModalOptions {
  open: boolean;
  onClose?: () => void;
  dialogRef?: RefObject<HTMLElement | null>;
  overlayRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
}

const modalStack: string[] = [];
let previousBodyOverflow = '';

function registerModal(id: string, lockScroll: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (lockScroll && modalStack.length === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  modalStack.push(id);
}

function unregisterModal(id: string, lockScroll: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }

  const index = modalStack.lastIndexOf(id);

  if (index !== -1) {
    modalStack.splice(index, 1);
  }

  if (lockScroll && modalStack.length === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function handleFocusTrap(event: KeyboardEvent, container: HTMLElement | null): void {
  if (event.key !== 'Tab' || !container) {
    return;
  }

  const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

  if (focusableElements.length === 0) {
    event.preventDefault();

    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1);

  if (event.shiftKey && document.activeElement === firstElement) {
    lastElement?.focus();
    event.preventDefault();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    firstElement?.focus();
    event.preventDefault();
  }
}

function openModalDialog(dialog: HTMLElement | null): void {
  if (typeof HTMLDialogElement === 'undefined' || !(dialog instanceof HTMLDialogElement)) {
    return;
  }

  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) {
      dialog.showModal();
    }
  } else {
    dialog.setAttribute('open', '');
  }
}

function closeModalDialog(dialog: HTMLElement | null): void {
  if (typeof HTMLDialogElement === 'undefined' || !(dialog instanceof HTMLDialogElement)) {
    return;
  }

  if (typeof dialog.close === 'function') {
    if (dialog.open) {
      dialog.close();
    }
  } else {
    dialog.removeAttribute('open');
  }
}

export function useModal({
  open,
  onClose,
  dialogRef,
  overlayRef,
  closeOnEscape = true,
  lockScroll = true,
  restoreFocus = true,
  trapFocus = true,
}: UseModalOptions): void {
  const modalId = useId();
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const dialogElement = dialogRef?.current ?? null;
    const overlayElement = overlayRef?.current;

    previouslyFocusedElementRef.current = (document.activeElement as HTMLElement) ?? null;
    registerModal(modalId, lockScroll);
    openModalDialog(dialogElement);

    const frameId = requestAnimationFrame(() => {
      if (!dialogElement) {
        return;
      }

      const firstFocusable = dialogElement.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        dialogElement.focus();
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        const isTopmost = modalStack.at(-1) === modalId;

        if (isTopmost) {
          event.stopPropagation();
          onCloseRef.current?.();
        }

        return;
      }

      if (trapFocus) {
        handleFocusTrap(event, dialogElement);
      }
    };

    const handleOverlayClick = (event: MouseEvent) => {
      if (event.target === overlayElement) {
        onCloseRef.current?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    overlayElement?.addEventListener('click', handleOverlayClick);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown);
      overlayElement?.removeEventListener('click', handleOverlayClick);

      closeModalDialog(dialogElement);
      unregisterModal(modalId, lockScroll);

      if (restoreFocus) {
        previouslyFocusedElementRef.current?.focus?.();
      }
    };
  }, [open, modalId, lockScroll, closeOnEscape, trapFocus, restoreFocus, dialogRef, overlayRef]);
}
