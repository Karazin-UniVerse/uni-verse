import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function hasTabbableInDirection(
  focusableElements: HTMLElement[],
  activeElement: HTMLElement,
  direction: 'previous' | 'next',
): boolean {
  const positionFlag =
    direction === 'previous' ? Node.DOCUMENT_POSITION_PRECEDING : Node.DOCUMENT_POSITION_FOLLOWING;

  return focusableElements.some((element) =>
    Boolean(activeElement.compareDocumentPosition(element) & positionFlag),
  );
}

export interface UseFocusTrapOptions {
  enabled?: boolean;
  restoreFocus?: boolean;
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  { enabled = true, restoreFocus = true }: UseFocusTrapOptions = {},
): void {
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const container = containerRef.current;

    previouslyFocusedElementRef.current = (document.activeElement as HTMLElement) ?? null;

    const frameId = requestAnimationFrame(() => {
      if (!container) {
        return;
      }

      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        container.focus();
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !container) {
        return;
      }

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();

        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      const activeElement = document.activeElement;

      if (
        activeElement instanceof HTMLElement &&
        container.contains(activeElement) &&
        !focusableElements.includes(activeElement)
      ) {
        if (
          event.shiftKey &&
          !hasTabbableInDirection(focusableElements, activeElement, 'previous')
        ) {
          lastElement?.focus();
          event.preventDefault();
        } else if (
          !event.shiftKey &&
          !hasTabbableInDirection(focusableElements, activeElement, 'next')
        ) {
          firstElement?.focus();
          event.preventDefault();
        }

        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        lastElement?.focus();
        event.preventDefault();
      } else if (!event.shiftKey && activeElement === lastElement) {
        firstElement?.focus();
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown);

      const previous = previouslyFocusedElementRef.current;

      if (restoreFocus && previous) {
        requestAnimationFrame(() => previous.focus());
      }
    };
  }, [enabled, restoreFocus, containerRef]);
}
