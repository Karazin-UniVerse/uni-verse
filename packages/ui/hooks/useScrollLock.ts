import { useEffect } from 'react';

/**
 * Locks background body scrolling when enabled is true.
 * Restores original overflow style on unmount or when disabled.
 */
export function useScrollLock(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [enabled]);
}
