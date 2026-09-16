import { useSyncExternalStore } from 'react';
import { BREAKPOINTS, type Breakpoint, type BreakpointKey } from '@universe/core';
import { isBrowser } from '@uni-hub/utils/browser';

export type MediaComparison = 'less' | 'wider' | 'narrower';

function resolveQuery(
  queryOrBreakpoint: string | Breakpoint | BreakpointKey,
  comparison: MediaComparison = 'less',
): string {
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
  breakpoint: Breakpoint | BreakpointKey,
  comparison?: MediaComparison,
  serverFallback?: boolean,
): boolean;
export function useMediaQuery(query: string, serverFallback?: boolean): boolean;
export function useMediaQuery(
  queryOrBreakpoint: string | Breakpoint | BreakpointKey,
  comparisonOrFallback: MediaComparison | boolean = 'less',
  serverFallback = false,
): boolean {
  let comparison: MediaComparison = 'less';
  let fallback = serverFallback;

  if (typeof comparisonOrFallback === 'string') {
    comparison = comparisonOrFallback;
  } else if (typeof comparisonOrFallback === 'boolean') {
    fallback = comparisonOrFallback;
  }

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
