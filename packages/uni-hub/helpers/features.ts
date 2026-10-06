import {
  FEATURE_STORAGE_KEYS,
  type FeatureFlags,
  type FeatureFlagKey,
} from '@core/constants/features';
import { isBrowser } from '@core/utils/browser';
import { resolveEnvFeatureFlags } from '@core/utils/features';

export const EMPTY_OVERRIDES: Partial<FeatureFlags> = Object.freeze({});

export function readStoredOverrides(): Partial<FeatureFlags> | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(FEATURE_STORAGE_KEYS.OVERRIDES);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const result: Partial<FeatureFlags> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'boolean') {
        result[key as FeatureFlagKey] = value;
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

export function writeStoredOverrides(overrides: Partial<FeatureFlags>): void {
  if (!isBrowser()) {
    return;
  }

  try {
    if (Object.keys(overrides).length === 0) {
      window.localStorage.removeItem(FEATURE_STORAGE_KEYS.OVERRIDES);
    } else {
      window.localStorage.setItem(FEATURE_STORAGE_KEYS.OVERRIDES, JSON.stringify(overrides));
    }
  } catch {
    // Gracefully ignore quota or security exceptions in restricted browser contexts
  }
}

export function removeStoredOverrides(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(FEATURE_STORAGE_KEYS.OVERRIDES);
  } catch {
    // Gracefully ignore storage exceptions
  }
}

export interface CreateOverrideStoreOptions {
  allowOverrides: boolean;
  initialFlags?: Partial<FeatureFlags>;
}

export interface OverrideStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Partial<FeatureFlags>;
  getServerSnapshot: () => Partial<FeatureFlags>;
  setOverride: (feature: FeatureFlagKey, enabled: boolean) => void;
  reset: () => void;
}

export function createOverrideStore({
  allowOverrides,
  initialFlags,
}: CreateOverrideStoreOptions): OverrideStore {
  const listeners = new Set<() => void>();
  const defaultSnapshot = initialFlags ?? EMPTY_OVERRIDES;

  let currentSnapshot: Partial<FeatureFlags> = defaultSnapshot;
  let hasLoadedFromStorage = false;

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      const handleStorage = (event: StorageEvent): void => {
        if (!allowOverrides || event.key !== FEATURE_STORAGE_KEYS.OVERRIDES) {
          return;
        }

        const stored = readStoredOverrides();

        currentSnapshot = stored ? { ...defaultSnapshot, ...stored } : defaultSnapshot;
        notify();
      };

      if (allowOverrides && isBrowser()) {
        window.addEventListener('storage', handleStorage);
      }

      return () => {
        listeners.delete(listener);

        if (allowOverrides && isBrowser()) {
          window.removeEventListener('storage', handleStorage);
        }
      };
    },

    getServerSnapshot: () => defaultSnapshot,

    getSnapshot: () => {
      if (!allowOverrides) {
        return defaultSnapshot;
      }

      if (!hasLoadedFromStorage) {
        hasLoadedFromStorage = true;
        const stored = readStoredOverrides();

        if (stored) {
          currentSnapshot = { ...defaultSnapshot, ...stored };
        }
      }

      return currentSnapshot;
    },

    setOverride: (feature: FeatureFlagKey, enabled: boolean) => {
      if (!allowOverrides) {
        return;
      }

      const nextSnapshot = {
        ...currentSnapshot,
        [feature]: enabled,
      };

      currentSnapshot = nextSnapshot;
      writeStoredOverrides(nextSnapshot);
      notify();
    },

    reset: () => {
      if (!allowOverrides) {
        return;
      }

      currentSnapshot = defaultSnapshot;
      removeStoredOverrides();
      notify();
    },
  };
}

/**
 * Resolves feature flags from environment variables.
 * NOTE: Next.js only inlines process.env.NEXT_PUBLIC_* variables when accessed
 * statically (e.g. process.env.NEXT_PUBLIC_FEATURE_MOODLE). Dynamic property access
 * or loops over process.env are NOT inlined at build time.
 */
export function getEnvDefaults(): FeatureFlags {
  return resolveEnvFeatureFlags({
    NEXT_PUBLIC_FEATURE_MOODLE: process.env.NEXT_PUBLIC_FEATURE_MOODLE,
    NEXT_PUBLIC_FEATURE_EDEAN: process.env.NEXT_PUBLIC_FEATURE_EDEAN,
    NEXT_PUBLIC_FEATURE_OPPORTUNITIES: process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES,
    NEXT_PUBLIC_FEATURE_PANEL: process.env.NEXT_PUBLIC_FEATURE_PANEL,
  });
}
