/**
 * @universe/core/utils/features
 * Helper functions for resolving and parsing feature flags.
 */

import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_ENV_KEYS,
  type FeatureFlags,
  type FeatureFlagKey,
} from '../constants/features.ts';
import { parseBoolean } from './boolean.ts';

const FEATURE_FLAG_KEYS = Object.keys(FEATURE_ENV_KEYS) as FeatureFlagKey[];

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
