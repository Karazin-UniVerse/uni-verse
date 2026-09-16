import { useSyncExternalStore } from 'react';
import { BREAKPOINTS, type Breakpoint } from '@universe/core';
import { isBrowser } from '@uni-hub/utils/browser';

export type MediaComparison = 'less' | 'wider' | 'narrower';

function resolveQuery(queryOrBreakpoint: string, comparison: MediaComparison = 'less'): string {
  if (queryOrBreakpoint in BREAKPOINTS) {
    const px = BREAKPOINTS[queryOrBreakpoint as keyof typeof BREAKPOINTS];

    return comparison === 'wider' ? `(min-width: ${px}px)` : `(max-width: ${px}px)`;
  }

  return queryOrBreakpoint;
}

/**
 * Performant hook to observe CSS media queries using useSyncExternalStore.
 * Accepts breakpoint enum/tokens (e.g. Breakpoint.MD) with flexible direction ('less' | 'wider'),
 * or full CSS media query strings.
 * Avoids window resize thrashing and handles SSR gracefully.
 */
export function useMediaQuery(
  breakpoint: Breakpoint,
  comparison?: MediaComparison,
  serverFallback?: boolean,
): boolean;
export function useMediaQuery(query: string, serverFallback?: boolean): boolean;
export function useMediaQuery(
  queryOrBreakpoint: string,
  comparisonOrFallback?: MediaComparison | boolean,
  serverFallback = false,
): boolean {
  const comparison: MediaComparison =
    typeof comparisonOrFallback === 'string' ? comparisonOrFallback : 'less';
  const fallback =
    typeof comparisonOrFallback === 'boolean' ? comparisonOrFallback : serverFallback;

  const query = resolveQuery(queryOrBreakpoint, comparison);

  const subscribe = (callback: () => void) => {
    if (!isBrowser || !window.matchMedia) {
      return () => {};
    }

    const mediaQueryList = window.matchMedia(query);

    mediaQueryList.addEventListener('change', callback);

    return () => mediaQueryList.removeEventListener('change', callback);
  };

  const getSnapshot = () => {
    if (!isBrowser || !window.matchMedia) {
      return fallback;
    }

    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => fallback;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
