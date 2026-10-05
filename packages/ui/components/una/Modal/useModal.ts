import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
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

  return {
    dialogRef,
    handleOverlayClick,
    handleKeyDown,
  };
}
