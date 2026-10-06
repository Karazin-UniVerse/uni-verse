'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import {
  FEATURE_STORAGE_KEYS,
  type FeatureFlags,
  type FeatureFlagKey,
} from '@core/constants/features';
import { isBrowser } from '@core/utils/browser';
import { mergeFeatureFlags, resolveEnvFeatureFlags } from '@core/utils/features';

export type FeatureContextValue = {
  flags: FeatureFlags;
  envDefaults: FeatureFlags;
  activeOverrides: Partial<FeatureFlags>;
  isEnabled: (feature: FeatureFlagKey) => boolean;
  setFeatureOverride: (feature: FeatureFlagKey, enabled: boolean) => void;
  resetFeatureOverrides: () => void;
  isOverridden: (feature?: FeatureFlagKey) => boolean;
};

const FeatureToggleContext = createContext<FeatureContextValue | null>(null);

const EMPTY_OVERRIDES: Partial<FeatureFlags> = Object.freeze({});

function readStoredOverrides(): Partial<FeatureFlags> | null {
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

function writeStoredOverrides(overrides: Partial<FeatureFlags>): void {
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

function removeStoredOverrides(): void {
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
const getEnvDefaults = (): FeatureFlags => {
  return resolveEnvFeatureFlags({
    NEXT_PUBLIC_FEATURE_MOODLE: process.env.NEXT_PUBLIC_FEATURE_MOODLE,
    NEXT_PUBLIC_FEATURE_EDEAN: process.env.NEXT_PUBLIC_FEATURE_EDEAN,
    NEXT_PUBLIC_FEATURE_OPPORTUNITIES: process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES,
    NEXT_PUBLIC_FEATURE_PANEL: process.env.NEXT_PUBLIC_FEATURE_PANEL,
  });
};

export interface FeatureToggleProviderProps {
  children?: React.ReactNode;
  allowOverrides?: boolean;
  initialFlags?: Partial<FeatureFlags>;
}

export const FeatureToggleProvider: React.FC<FeatureToggleProviderProps> = ({
  children,
  allowOverrides: allowOverridesProp,
  initialFlags,
}) => {
  // Production safeguard: feature overrides are disabled by default in production
  const isProduction = process.env.NODE_ENV === 'production';
  const allowOverrides = allowOverridesProp ?? !isProduction;

  const envDefaults = useMemo(() => getEnvDefaults(), []);

  const store = useMemo(
    () => createOverrideStore({ allowOverrides, initialFlags }),
    [allowOverrides, initialFlags],
  );

  const overrides = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const effectiveFlags = useMemo(() => {
    return mergeFeatureFlags(envDefaults, overrides);
  }, [envDefaults, overrides]);

  const setFeatureOverride = useCallback(
    (feature: FeatureFlagKey, enabled: boolean) => {
      store.setOverride(feature, enabled);
    },
    [store],
  );

  const resetFeatureOverrides = useCallback(() => {
    store.reset();
  }, [store]);

  const isEnabled = useCallback(
    (feature: FeatureFlagKey): boolean => {
      return Boolean(effectiveFlags[feature]);
    },
    [effectiveFlags],
  );

  const isOverridden = useCallback(
    (feature?: FeatureFlagKey): boolean => {
      if (feature) {
        return overrides[feature] !== undefined;
      }

      return Object.keys(overrides).length > 0;
    },
    [overrides],
  );

  const contextValue = useMemo<FeatureContextValue>(() => {
    return {
      flags: effectiveFlags,
      envDefaults,
      activeOverrides: overrides,
      isEnabled,
      setFeatureOverride,
      resetFeatureOverrides,
      isOverridden,
    };
  }, [
    effectiveFlags,
    envDefaults,
    overrides,
    isEnabled,
    setFeatureOverride,
    resetFeatureOverrides,
    isOverridden,
  ]);

  return (
    <FeatureToggleContext.Provider value={contextValue}>{children}</FeatureToggleContext.Provider>
  );
};

export const useFeatures = (): FeatureFlags => {
  const context = useContext(FeatureToggleContext);

  if (!context) {
    throw new Error('useFeatures must be used within a FeatureToggleProvider');
  }

  return context.flags;
};

export const useFeatureControls = (): FeatureContextValue => {
  const context = useContext(FeatureToggleContext);

  if (!context) {
    throw new Error('useFeatureControls must be used within a FeatureToggleProvider');
  }

  return context;
};
