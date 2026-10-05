import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type UseFocusTrapOptions = {
  enabled?: boolean;
  restoreFocus?: boolean;
};

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions = {},
): void {
  const { enabled = true, restoreFocus = true } = options;
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return;
    }

    if (restoreFocus) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    }

    const frameId = requestAnimationFrame(() => {
      if (!ref.current) {
        return;
      }

      const focusableElements = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        ref.current.focus();
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !ref.current) {
        return;
      }

      const focusableElements = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

      if (focusableElements.length === 0) {
        event.preventDefault();

        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown);

      if (restoreFocus && previouslyFocusedElementRef.current?.focus) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [ref, enabled, restoreFocus]);
}
