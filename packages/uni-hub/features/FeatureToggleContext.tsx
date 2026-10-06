'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import type { FeatureFlags, FeatureFlagKey } from '@core/constants/features';
import { mergeFeatureFlags } from '@core/utils/features';
import { createOverrideStore, getEnvDefaults } from '../helpers/features';

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
