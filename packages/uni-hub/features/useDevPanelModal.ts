import { useEffect, useRef, type RefObject, type Dispatch, type SetStateAction } from 'react';

interface UseDevPanelModalOptions {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  containerRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
}

export function useDevPanelModal({
  isOpen,
  setIsOpen,
  containerRef,
  panelRef,
}: UseDevPanelModalOptions): void {
  const wasOpenRef = useRef(false);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );

      firstFocusable?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      const trigger = containerRef.current?.querySelector<HTMLButtonElement>('button');

      trigger?.focus();
    }
  }, [isOpen, containerRef, panelRef]);

  // Keyboard navigation (Escape to close, Ctrl+Shift+F to toggle)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setIsOpen((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
  }, [isOpen, containerRef, setIsOpen]);
}
