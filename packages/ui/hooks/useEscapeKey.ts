import { useEffect, useRef } from 'react';

export interface UseEscapeKeyOptions {
  enabled?: boolean;
}

const activeHandlers: Array<(event: KeyboardEvent) => void> = [];

export function shouldTriggerEscapeKey(event: { key: string }): boolean {
  return event.key === 'Escape';
}

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

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (shouldTriggerEscapeKey(event) && activeHandlers.at(-1) === handleKeyDown) {
        event.stopPropagation();
        handlerRef.current(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    activeHandlers.push(handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      activeHandlers.splice(activeHandlers.indexOf(handleKeyDown), 1);
    };
  }, [enabled]);
}
