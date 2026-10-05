import { useCallback, useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { useModal } from '@una';

interface UseDevPanelModalOptions {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  panelRef: RefObject<HTMLDialogElement | null>;
}

export interface UseDevPanelModalReturn {
  handleToggle: () => void;
  handleClose: () => void;
}

function isToggleShortcut(event: KeyboardEvent): boolean {
  return event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f';
}

export function useDevPanelModal({
  isOpen,
  setIsOpen,
  panelRef,
}: UseDevPanelModalOptions): UseDevPanelModalReturn {
  const handleClose = useCallback((): void => {
    setIsOpen(false);
  }, [setIsOpen]);

  const handleToggle = useCallback((): void => {
    setIsOpen((previous) => !previous);
  }, [setIsOpen]);

  useModal({
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

  // Handle backdrop click on the native dialog
  useEffect(() => {
    const dialog = panelRef.current;

    if (!isOpen || !dialog) {
      return;
    }

    const handleDialogClick = (event: MouseEvent) => {
      if (event.target !== dialog) {
        return;
      }

      const rect = dialog.getBoundingClientRect();
      const isInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (!isInside) {
        handleClose();
      }
    };

    dialog.addEventListener('click', handleDialogClick);

    return () => {
      dialog.removeEventListener('click', handleDialogClick);
    };
  }, [isOpen, panelRef, handleClose]);

  return {
    handleToggle,
    handleClose,
  };
}
