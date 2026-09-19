import { isBrowser } from '../browser.ts';

export { isBrowser };

/**
 * Checks whether an active user session exists in local storage.
 * Works safely in both client (browser) and SSR environments.
 */
export function isLoggedIn(storage?: { getItem: (key: string) => string | null }): boolean {
  const store = storage ?? (isBrowser() ? window.localStorage : undefined);

  if (!store) {
    return false;
  }

  return store.getItem('isLoggedIn') === 'true' && Boolean(store.getItem('accessToken'));
}
