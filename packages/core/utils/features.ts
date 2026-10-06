/**
 * @universe/core/utils/features
 * Helper functions for resolving, merging, and managing feature flags and client overrides.
 */

import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_ENV_KEYS,
  FEATURE_STORAGE_KEYS,
  type FeatureFlags,
  type FeatureFlagKey,
} from '../constants/features.ts';
import { parseBoolean } from './boolean.ts';
import { isBrowser } from './browser.ts';

const FEATURE_FLAG_KEYS = Object.keys(FEATURE_ENV_KEYS) as FeatureFlagKey[];

export const EMPTY_OVERRIDES: Partial<FeatureFlags> = Object.freeze({});

/**
 * Resolves feature flags from environment variables.
 */
export const resolveEnvFeatureFlags = (
  env: Record<string, string | undefined> = {},
): FeatureFlags => {
  const flags = { ...DEFAULT_FEATURE_FLAGS };

  for (const flagKey of FEATURE_FLAG_KEYS) {
    const envVar = FEATURE_ENV_KEYS[flagKey];
    const parsed = parseBoolean(env[envVar]);

    if (parsed !== undefined) {
      flags[flagKey] = parsed;
    }
  }

  return flags;
};

/**
 * Merges base feature flags with multiple layers of overrides.
 */
export const mergeFeatureFlags = (
  base: FeatureFlags,
  ...overrides: (Partial<FeatureFlags> | null | undefined)[]
): FeatureFlags => {
  const result: FeatureFlags = { ...base };

  for (const override of overrides) {
    if (!override) {
      continue;
    }

    for (const key of FEATURE_FLAG_KEYS) {
      if (typeof override[key] === 'boolean') {
        result[key] = override[key];
      }
    }
  }

  return result;
};

/**
 * Reads stored feature flag overrides from localStorage safely.
 */
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

/**
 * Writes feature flag overrides to localStorage safely.
 */
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

/**
 * Clears stored feature flag overrides from localStorage.
 */
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

/**
 * Creates a reactive client-side store for feature flag overrides compatible with React useSyncExternalStore.
 */
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
