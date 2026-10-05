import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export type UseClickOutsideOptions = {
  enabled?: boolean;
  ignoreRef?: RefObject<HTMLElement | null>;
};

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
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

    const handleEvent = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;

      if (!target || !ref.current) {
        return;
      }

      if (ref.current.contains(target)) {
        return;
      }

      if (ignoreRef?.current && ignoreRef.current.contains(target)) {
        return;
      }

      handlerRef.current(event);
    };

    document.addEventListener('mousedown', handleEvent);
    document.addEventListener('touchstart', handleEvent);

    return () => {
      document.removeEventListener('mousedown', handleEvent);
      document.removeEventListener('touchstart', handleEvent);
    };
  }, [ref, ignoreRef, enabled]);
}
