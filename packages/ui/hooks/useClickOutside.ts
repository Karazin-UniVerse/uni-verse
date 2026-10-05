import { useEffect, useRef, type RefObject } from 'react';

export interface UseClickOutsideOptions {
  enabled?: boolean;
  ignoreRef?: RefObject<HTMLElement | null>;
}

export function shouldTriggerClickOutside(
  target: Node | null,
  eventTarget: Node | null,
  ignoreElement?: Node | null,
): boolean {
  if (!target || !eventTarget) {
    return false;
  }

  if (target.contains(eventTarget)) {
    return false;
  }

  if (ignoreElement?.contains(eventTarget)) {
    return false;
  }

  return true;
}

export function useClickOutside(
  targetRef: RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  options: UseClickOutsideOptions = {},
): void {
  const { enabled = true, ignoreRef } = options;
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent): void => {
      const shouldTrigger = shouldTriggerClickOutside(
        targetRef.current,
        event.target as Node | null,
        ignoreRef?.current,
      );

      if (shouldTrigger) {
        handlerRef.current(event);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [enabled, targetRef, ignoreRef]);
}
