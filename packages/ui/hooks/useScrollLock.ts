import { useEffect } from 'react';
import { isBrowser } from '@core/utils/browser';

let lockCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let lockedContainers: { element: HTMLElement; originalOverflow: string }[] = [];

/**
 * Locks background page scrolling when enabled is true.
 * Handles document body, html, and explicit `[data-scroll-container]` elements.
 * Uses a reference counter to safely support nested or stacked modals.
 */
export function useScrollLock(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled || !isBrowser()) {
      return;
    }

    if (lockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const containers = document.querySelectorAll<HTMLElement>('[data-scroll-container]');

      lockedContainers = [];

      containers.forEach((element) => {
        lockedContainers.push({
          element,
          originalOverflow: element.style.overflowY,
        });
        element.style.overflowY = 'hidden';
      });
    }

    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);

      if (lockCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;

        lockedContainers.forEach(({ element, originalOverflow }) => {
          element.style.overflowY = originalOverflow;
        });

        lockedContainers = [];
      }
    };
  }, [enabled]);
}
