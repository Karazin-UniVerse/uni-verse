import { useSyncExternalStore } from 'react';

/**
 * Performant hook to observe CSS media queries using useSyncExternalStore.
 * Avoids window resize thrashing and handles SSR gracefully.
 */
export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = (callback: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return () => {};
    }

    const mediaQueryList = window.matchMedia(query);

    mediaQueryList.addEventListener('change', callback);

    return () => mediaQueryList.removeEventListener('change', callback);
  };

  const getSnapshot = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return serverFallback;
    }

    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => serverFallback;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
