'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import type { FeatureFlags, FeatureFlagKey } from '@core/constants/features';
import {
  createOverrideStore,
  mergeFeatureFlags,
  resolveEnvFeatureFlags,
} from '@core/utils/features';

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
}

export const FeatureToggleProvider: React.FC<FeatureToggleProviderProps> = ({ children }) => {
  const envDefaults = useMemo(() => getEnvDefaults(), []);

  // Overrides are allowed outside production OR when the feature panel is explicitly enabled in env
  const allowOverrides = process.env.NODE_ENV !== 'production' || envDefaults.isFeaturePanelEnabled;
  const store = useMemo(() => createOverrideStore({ allowOverrides }), [allowOverrides]);

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
      const currentOverrides = store.getSnapshot();

      if (feature) {
        return currentOverrides[feature] !== undefined;
      }

      return Object.keys(currentOverrides).length > 0;
    },
    [store],
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
