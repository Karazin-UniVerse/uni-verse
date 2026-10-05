'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { type FeatureFlags, type FeatureFlagKey } from '@core/constants/features';
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
  initialFlags?: Partial<FeatureFlags>;
}

export const FeatureToggleProvider: React.FC<FeatureToggleProviderProps> = ({
  children,
  initialFlags,
}) => {
  const envDefaults = useMemo(() => getEnvDefaults(), []);
  const [overrides, setOverrides] = useState<Partial<FeatureFlags>>(() => initialFlags ?? {});

  const effectiveFlags = useMemo(() => {
    return mergeFeatureFlags(envDefaults, overrides);
  }, [envDefaults, overrides]);

  const setFeatureOverride = useCallback((feature: FeatureFlagKey, enabled: boolean) => {
    setOverrides((previous) => ({
      ...previous,
      [feature]: enabled,
    }));
  }, []);

  const resetFeatureOverrides = useCallback(() => {
    setOverrides(initialFlags ?? {});
  }, [initialFlags]);

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
