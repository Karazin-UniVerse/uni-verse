import { isBrowser } from '@uni-hub/utils/browser';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }

    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }

    return null;
  } catch {
    return null;
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      const storage = getStorage();

      return storage ? storage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): boolean {
    try {
      const storage = getStorage();

      if (!storage) {
        return false;
      }

      storage.setItem(key, value);

      return true;
    } catch {
      return false;
    }
  },
  removeItem(key: string): boolean {
    try {
      const storage = getStorage();

      if (!storage) {
        return false;
      }

      storage.removeItem(key);

      return true;
    } catch {
      return false;
    }
  },
};

export function isDemoMode(): boolean {
  return (
    safeStorage.getItem('isDemo') === 'true' || safeStorage.getItem('accessToken') === 'demo-token'
  );
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isBrowser && window.location.hostname !== 'localhost'
    ? 'https://p01--backend--jm9qjnmpm4m2.code.run'
    : 'http://localhost:3001');
