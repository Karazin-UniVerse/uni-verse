'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_OVERRIDES_STORAGE_KEY,
  type FeatureFlags,
  type FeatureFlagKey,
} from '@core/constants/features';
import {
  mergeFeatureFlags,
  parseFeatureQueryParams,
  resolveEnvFeatureFlags,
} from '@core/utils/features';
import { safeStorage } from '@uni-hub/services/api';

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

const EVENT_NAME = 'universe-feature-flags-change';

const getEnvDefaults = (): FeatureFlags => {
  return resolveEnvFeatureFlags({
    NEXT_PUBLIC_FEATURE_MOODLE: process.env.NEXT_PUBLIC_FEATURE_MOODLE,
    NEXT_PUBLIC_FEATURE_EDEAN: process.env.NEXT_PUBLIC_FEATURE_EDEAN,
    NEXT_PUBLIC_FEATURE_OPPORTUNITIES: process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES,
  });
};

const getStoredOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = safeStorage.getItem(FEATURE_OVERRIDES_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as Partial<FeatureFlags>;
  } catch {
    return {};
  }
};

const getQueryOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') {
    return {};
  }

  return parseFeatureQueryParams(window.location.search);
};

let cachedSnapshot: FeatureFlags = DEFAULT_FEATURE_FLAGS;
let cachedSnapshotKey = '';

const computeFlagsSnapshot = (): FeatureFlags => {
  const envDefaults = getEnvDefaults();
  const stored = getStoredOverrides();
  const query = getQueryOverrides();

  const merged = mergeFeatureFlags(envDefaults, stored, query);
  const key = JSON.stringify(merged);

  if (key !== cachedSnapshotKey) {
    cachedSnapshotKey = key;
    cachedSnapshot = merged;
  }

  return cachedSnapshot;
};

const subscribeToFeatureFlags = (callback: () => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('storage', callback);
  window.addEventListener(EVENT_NAME, callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT_NAME, callback);
  };
};

const getServerSnapshot = (): FeatureFlags => {
  return getEnvDefaults();
};

export interface FeatureToggleProviderProps {
  children?: React.ReactNode;
  initialFlags?: Partial<FeatureFlags>;
}

export const FeatureToggleProvider: React.FC<FeatureToggleProviderProps> = ({
  children,
  initialFlags,
}) => {
  const flags = useSyncExternalStore(
    subscribeToFeatureFlags,
    computeFlagsSnapshot,
    getServerSnapshot,
  );

  const envDefaults = useMemo(() => getEnvDefaults(), []);

  const activeOverrides = useMemo(() => {
    const stored = getStoredOverrides();
    const query = getQueryOverrides();

    return { ...stored, ...query, ...initialFlags };
  }, [initialFlags]);

  const effectiveFlags = useMemo(() => {
    return initialFlags ? mergeFeatureFlags(flags, initialFlags) : flags;
  }, [flags, initialFlags]);

  const setFeatureOverride = useCallback((feature: FeatureFlagKey, enabled: boolean) => {
    const currentOverrides = getStoredOverrides();
    const updated = {
      ...currentOverrides,
      [feature]: enabled,
    };

    safeStorage.setItem(FEATURE_OVERRIDES_STORAGE_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENT_NAME));
    }
  }, []);

  const resetFeatureOverrides = useCallback(() => {
    safeStorage.removeItem(FEATURE_OVERRIDES_STORAGE_KEY);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENT_NAME));
    }
  }, []);

  const isEnabled = useCallback(
    (feature: FeatureFlagKey): boolean => {
      return Boolean(effectiveFlags[feature]);
    },
    [effectiveFlags],
  );

  const isOverridden = useCallback(
    (feature?: FeatureFlagKey): boolean => {
      if (feature) {
        return activeOverrides[feature] !== undefined;
      }

      return Object.keys(activeOverrides).length > 0;
    },
    [activeOverrides],
  );

  const contextValue = useMemo<FeatureContextValue>(() => {
    return {
      flags: effectiveFlags,
      envDefaults,
      activeOverrides,
      isEnabled,
      setFeatureOverride,
      resetFeatureOverrides,
      isOverridden,
    };
  }, [
    effectiveFlags,
    envDefaults,
    activeOverrides,
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
    return getEnvDefaults();
  }

  return context.flags;
};

export const useFeature = (feature: FeatureFlagKey): boolean => {
  const context = useContext(FeatureToggleContext);

  if (!context) {
    return Boolean(getEnvDefaults()[feature]);
  }

  return context.isEnabled(feature);
};

export const useFeatureControls = (): FeatureContextValue => {
  const context = useContext(FeatureToggleContext);

  if (!context) {
    const defaults = getEnvDefaults();

    return {
      flags: defaults,
      envDefaults: defaults,
      activeOverrides: {},
      isEnabled: (feature) => Boolean(defaults[feature]),
      setFeatureOverride: () => {},
      resetFeatureOverrides: () => {},
      isOverridden: () => false,
    };
  }

  return context;
};
