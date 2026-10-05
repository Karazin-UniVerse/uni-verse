import { useEffect, useRef, type RefObject } from 'react';

export interface UseModalOptions {
  open: boolean;
  onClose?: () => void;
  dialogRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
}

const noop = (): void => {};

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
  if (
    typeof HTMLDialogElement === 'undefined' ||
    !(dialog instanceof HTMLDialogElement) ||
    dialog.open
  ) {
    return;
  }

  const showModal = dialog.showModal ?? noop;

  showModal.call(dialog);
}

function closeModalDialog(dialog: HTMLElement | null): void {
  if (
    typeof HTMLDialogElement === 'undefined' ||
    !(dialog instanceof HTMLDialogElement) ||
    !dialog.open
  ) {
    return;
  }

  const close = dialog.close ?? noop;

  close.call(dialog);
}

export function useModal({
  open,
  onClose,
  dialogRef,
  closeOnEscape = true,
  lockScroll = true,
  restoreFocus = true,
  trapFocus = true,
}: UseModalOptions): void {
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

    previouslyFocusedElementRef.current = (document.activeElement as HTMLElement) ?? null;

    const originalOverflow = document.body.style.overflow;

    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

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
        event.stopPropagation();
        onCloseRef.current?.();

        return;
      }

      if (trapFocus) {
        handleFocusTrap(event, dialogElement);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown);

      closeModalDialog(dialogElement);

      if (lockScroll) {
        document.body.style.overflow = originalOverflow;
      }

      if (restoreFocus) {
        previouslyFocusedElementRef.current?.focus?.();
      }
    };
  }, [open, lockScroll, closeOnEscape, trapFocus, restoreFocus, dialogRef]);
}
