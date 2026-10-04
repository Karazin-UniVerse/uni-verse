import { useEffect, useRef, type RefObject, type Dispatch, type SetStateAction } from 'react';

interface UseDevPanelModalOptions {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  containerRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDialogElement | null>;
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

      if (dialog) {
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
    } else {
      if (dialog) {
        if (typeof dialog.close === 'function') {
          if (dialog.open) {
            dialog.close();
          }
        } else {
          dialog.removeAttribute('open');
        }
      }

      if (previousActiveElementRef.current && document.contains(previousActiveElementRef.current)) {
        previousActiveElementRef.current.focus();
      } else {
        const trigger = containerRef.current?.querySelector<HTMLButtonElement>('button');

        trigger?.focus();
      }

      previousActiveElementRef.current = null;
    }
  }, [isOpen, containerRef, panelRef]);

  // Keyboard navigation (Escape to close, Ctrl+Shift+F to toggle, Tab trap)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
          event.preventDefault();
          setIsOpen(true);
        }

        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);

        return;
      }

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setIsOpen(false);

        return;
      }

      if (event.key === 'Tab') {
        const dialog = panelRef.current;

        if (!dialog) {
          return;
        }

        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );

        if (focusable.length === 0) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
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

      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        const isInDialog =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;

        if (!isInDialog) {
          setIsOpen(false);

          return;
        }
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
