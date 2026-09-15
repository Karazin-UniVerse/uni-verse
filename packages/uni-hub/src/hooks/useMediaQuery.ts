import { useSyncExternalStore } from 'react';
import { BREAKPOINTS, type Breakpoint } from '@universe/core';
import { isBrowser } from '@uni-hub/utils/browser';

function resolveQuery(queryOrBreakpoint: string): string {
  if (queryOrBreakpoint in BREAKPOINTS) {
    return `(max-width: ${BREAKPOINTS[queryOrBreakpoint as Breakpoint]}px)`;
  }

  return queryOrBreakpoint;
}

/**
 * Performant hook to observe CSS media queries using useSyncExternalStore.
 * Accepts full CSS media query strings or shared breakpoint tokens ('sm', 'md', etc.).
 * Avoids window resize thrashing and handles SSR gracefully.
 */
export function useMediaQuery(breakpoint: Breakpoint, serverFallback?: boolean): boolean;
export function useMediaQuery(query: string, serverFallback?: boolean): boolean;
export function useMediaQuery(queryOrBreakpoint: string, serverFallback = false): boolean {
  const query = resolveQuery(queryOrBreakpoint);

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
