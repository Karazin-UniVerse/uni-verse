import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { useModal } from '@una';

interface UseDevPanelModalOptions {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  panelRef: RefObject<HTMLDialogElement | null>;
}

export interface UseDevPanelModalReturn {
  handleToggle: () => void;
  handleClose: () => void;
  handleBackdropClick: (event?: React.MouseEvent<HTMLElement>) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
}

function isToggleShortcut(event: KeyboardEvent): boolean {
  return event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f';
}

export function useDevPanelModal({
  isOpen,
  setIsOpen,
  panelRef,
}: UseDevPanelModalOptions): UseDevPanelModalReturn {
  const handleClose = (): void => {
    setIsOpen(false);
  };

  const handleToggle = (): void => {
    setIsOpen((previous) => !previous);
  };

  const { handleOverlayClick, handleKeyDown } = useModal({
    open: isOpen,
    onClose: handleClose,
    dialogRef: panelRef,
    lockScroll: false,
    closeOnEscape: true,
    trapFocus: true,
    restoreFocus: true,
  });

  // Global toggle shortcut (Ctrl+Shift+F)
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (isToggleShortcut(event)) {
        event.preventDefault();
        setIsOpen((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [setIsOpen]);

  return {
    handleToggle,
    handleClose,
    handleBackdropClick: handleOverlayClick,
    handleKeyDown,
  };
}
