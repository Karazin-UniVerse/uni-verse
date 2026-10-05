import { useEffect, useRef } from 'react';

export type UseEscapeKeyOptions = {
  enabled?: boolean;
};

export function useEscapeKey(
  handler: (event: KeyboardEvent) => void,
  options: UseEscapeKeyOptions = {},
): void {
  const { enabled = true } = options;
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handlerRef.current(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
}
