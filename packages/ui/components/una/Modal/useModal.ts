import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import { noop } from '@core/utils/fn';

export interface UseModalOptions {
  open: boolean;
  onClose?: () => void;
  dialogRef?: RefObject<HTMLElement | null>;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
}

export interface UseModalReturn {
  dialogRef: RefObject<HTMLElement | null>;
  handleOverlayClick: (event?: ReactMouseEvent<HTMLElement>) => void;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
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
  if (dialog instanceof HTMLDialogElement && !dialog.open) {
    (dialog.showModal ?? noop).call(dialog);
  }
}

function closeModalDialog(dialog: HTMLElement | null): void {
  if (dialog instanceof HTMLDialogElement && dialog.open) {
    (dialog.close ?? noop).call(dialog);
  }
}

export function useModal({
  open,
  onClose,
  dialogRef: externalDialogRef,
  closeOnClickOutside = false,
  closeOnEscape = true,
  lockScroll = true,
  restoreFocus = true,
  trapFocus = true,
}: UseModalOptions): UseModalReturn {
  const localDialogRef = useRef<HTMLElement | null>(null);
  const dialogRef = externalDialogRef ?? localDialogRef;
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const handleOverlayClick = (event?: ReactMouseEvent<HTMLElement>): void => {
    if (!closeOnClickOutside) {
      return;
    }

    if (!event || event.target === event.currentTarget) {
      onCloseRef.current?.();
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    if (closeOnEscape && event.key === 'Escape') {
      event.stopPropagation();
      onCloseRef.current?.();

      return;
    }

    if (trapFocus) {
      handleFocusTrap(event.nativeEvent, dialogRef.current);
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const dialogElement = dialogRef.current;

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

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleGlobalKeyDown);

      closeModalDialog(dialogElement);

      if (lockScroll) {
        document.body.style.overflow = originalOverflow;
      }

      const previous = previouslyFocusedElementRef.current;

      if (restoreFocus && previous) {
        requestAnimationFrame(() => previous.focus());
      }
    };
  }, [open, lockScroll, closeOnEscape, restoreFocus, dialogRef]);

  return {
    dialogRef,
    handleOverlayClick,
    handleKeyDown,
  };
}
