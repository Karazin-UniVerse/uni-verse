import { useSyncExternalStore } from 'react';
import { BREAKPOINTS, type Breakpoint } from '@core/constants/breakpoints';
import { isBrowser } from '@uni-hub/utils/browser';

export type MediaComparison = 'less' | 'wider';

function resolveBreakpointPx(breakpoint: Breakpoint | number): number | null {
  if (typeof breakpoint === 'number') {
    return breakpoint;
  }

  if (breakpoint in BREAKPOINTS) {
    return BREAKPOINTS[breakpoint as Breakpoint];
  }

  return null;
}

function resolveQuery(arg1: string | number, arg2?: MediaComparison | Breakpoint | number): string {
  if (arg1 === 'less' || arg1 === 'wider') {
    const px =
      typeof arg2 === 'number' || typeof arg2 === 'string'
        ? resolveBreakpointPx(arg2 as Breakpoint | number)
        : null;

    if (px !== null) {
      return arg1 === 'wider' ? `(min-width: ${px}px)` : `(max-width: ${px}px)`;
    }
  }

  const px =
    typeof arg1 === 'number' || (typeof arg1 === 'string' && arg1 in BREAKPOINTS)
      ? resolveBreakpointPx(arg1 as Breakpoint | number)
      : null;

  if (px !== null) {
    const comparison: MediaComparison = arg2 === 'wider' ? 'wider' : 'less';

    return comparison === 'wider' ? `(min-width: ${px}px)` : `(max-width: ${px}px)`;
  }

  return String(arg1);
}

/**
 * Performant hook to observe CSS media queries using useSyncExternalStore.
 * Supports readable syntax:
 *   useMediaQuery('less', BREAKPOINTS.md)
 *   useMediaQuery('wider', BREAKPOINTS.lg)
 * as well as raw media query strings like useMediaQuery('(max-width: 768px)').
 * Avoids window resize thrashing and handles SSR gracefully.
 */
export function useMediaQuery(
  comparison: MediaComparison,
  breakpoint: Breakpoint | number,
  serverFallback?: boolean,
): boolean;
export function useMediaQuery(
  breakpoint: Breakpoint | number,
  comparison?: MediaComparison,
  serverFallback?: boolean,
): boolean;
export function useMediaQuery(query: string, serverFallback?: boolean): boolean;
export function useMediaQuery(
  arg1: string | number,
  arg2?: MediaComparison | Breakpoint | number | boolean,
  arg3 = false,
): boolean {
  let query: string;
  let serverFallback = false;

  if (arg1 === 'less' || arg1 === 'wider') {
    query = resolveQuery(arg1, arg2 as Breakpoint | number);
    serverFallback = typeof arg3 === 'boolean' ? arg3 : false;
  } else if (typeof arg2 === 'boolean') {
    query = resolveQuery(arg1);
    serverFallback = arg2;
  } else if (typeof arg2 === 'string' && (arg2 === 'less' || arg2 === 'wider')) {
    query = resolveQuery(arg1, arg2);
    serverFallback = arg3;
  } else {
    query = resolveQuery(arg1);
    serverFallback = typeof arg3 === 'boolean' ? arg3 : false;
  }

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
      return serverFallback;
    }

    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => serverFallback;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
