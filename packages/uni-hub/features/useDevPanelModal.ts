import { useEffect, type RefObject, type Dispatch, type SetStateAction } from 'react';
import { useModal } from '@una';

interface UseDevPanelModalOptions {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  containerRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDialogElement | null>;
}

function isToggleShortcut(event: KeyboardEvent): boolean {
  return event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f';
}

function isClickInsideDialog(event: MouseEvent, dialog: HTMLDialogElement): boolean {
  const rect = dialog.getBoundingClientRect();

  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

export function useDevPanelModal({
  isOpen,
  setIsOpen,
  containerRef,
  panelRef,
}: UseDevPanelModalOptions): void {
  useModal({
    open: isOpen,
    onClose: () => setIsOpen(false),
    dialogRef: panelRef,
    lockScroll: false,
    closeOnEscape: true,
    trapFocus: true,
    restoreFocus: true,
  });

  // Global toggle shortcut (Ctrl+Shift+F)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isToggleShortcut(event)) {
        event.preventDefault();
        setIsOpen((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setIsOpen]);

  // Click outside (or on dialog backdrop) to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dialog = panelRef.current;

      if (!dialog) {
        return;
      }

      if (event.target === dialog && !isClickInsideDialog(event, dialog)) {
        setIsOpen(false);

        return;
      }

      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, containerRef, panelRef, setIsOpen]);
}
