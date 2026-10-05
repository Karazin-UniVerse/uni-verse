import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import { noop } from '@core/utils/fn';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useScrollLock } from '../../../hooks/useScrollLock';

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
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useScrollLock(open && lockScroll);
  useFocusTrap(dialogRef, { enabled: open && trapFocus, restoreFocus });
  useEscapeKey(
    () => {
      onCloseRef.current?.();
    },
    { enabled: open && closeOnEscape },
  );

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
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const dialogElement = dialogRef.current;

    openModalDialog(dialogElement);

    return () => {
      closeModalDialog(dialogElement);
    };
  }, [open, dialogRef]);

  return {
    dialogRef,
    handleOverlayClick,
    handleKeyDown,
  };
}
