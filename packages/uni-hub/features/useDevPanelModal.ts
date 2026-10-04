import { useEffect, useRef, type RefObject, type Dispatch, type SetStateAction } from 'react';

interface UseDevPanelModalOptions {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  containerRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDialogElement | null>;
}

function openModalDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) {
    return;
  }

  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) {
      dialog.showModal();
    }
  } else {
    dialog.setAttribute('open', '');
  }

  const firstFocusable = dialog.querySelector<HTMLElement>(
    'button, input, [tabindex]:not([tabindex="-1"])',
  );

  firstFocusable?.focus();
}

function closeModalDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) {
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

function restoreFocus(previousElement: HTMLElement | null, container: HTMLElement | null): void {
  if (previousElement && document.contains(previousElement)) {
    previousElement.focus();

    return;
  }

  const trigger = container?.querySelector<HTMLButtonElement>('button');

  trigger?.focus();
}

function isToggleShortcut(event: KeyboardEvent): boolean {
  return event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f';
}

function trapTabKey(event: KeyboardEvent, dialog: HTMLDialogElement | null): void {
  if (event.key !== 'Tab' || !dialog) {
    return;
  }

  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  );

  if (focusable.length === 0) {
    return;
  }

  const first = focusable[0];
  const last = focusable.at(-1);

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
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
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Dialog open/close, focus management, and focus restoration
  useEffect(() => {
    const dialog = panelRef.current;

    if (isOpen) {
      previousActiveElementRef.current = (document.activeElement as HTMLElement) ?? null;
      openModalDialog(dialog);

      return;
    }

    closeModalDialog(dialog);
    restoreFocus(previousActiveElementRef.current, containerRef.current);
    previousActiveElementRef.current = null;
  }, [isOpen, containerRef, panelRef]);

  // Keyboard navigation (Escape to close, Ctrl+Shift+F to toggle, Tab trap)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        if (isToggleShortcut(event)) {
          event.preventDefault();
          setIsOpen(true);
        }

        return;
      }

      if (event.key === 'Escape' || isToggleShortcut(event)) {
        event.preventDefault();
        setIsOpen(false);

        return;
      }

      trapTabKey(event, panelRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setIsOpen, panelRef]);

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
