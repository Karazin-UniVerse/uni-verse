/**
 * @universe/core/utils/features
 * Helper functions for resolving and parsing feature flags.
 */

import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_ENV_KEYS,
  type FeatureFlags,
} from '../constants/features.ts';
import { parseBoolean } from './boolean.ts';

export { parseBoolean } from './boolean.ts';

/**
 * Parses boolean representations (true, 'true', '1', 'yes', 'on').
 */
export const parseBooleanFlag = (value: unknown, fallback: boolean): boolean => {
  return parseBoolean(value, fallback);
};

/**
 * Resolves feature flags from environment variables.
 */
export const resolveEnvFeatureFlags = (
  env: Record<string, string | undefined> = {},
): FeatureFlags => {
  return {
    isMoodleIntegrationEnabled: parseBoolean(
      env[FEATURE_ENV_KEYS.isMoodleIntegrationEnabled],
      DEFAULT_FEATURE_FLAGS.isMoodleIntegrationEnabled,
    ),
    isEDeanEnabled: parseBoolean(
      env[FEATURE_ENV_KEYS.isEDeanEnabled],
      DEFAULT_FEATURE_FLAGS.isEDeanEnabled,
    ),
    isOpportunitiesPlatformEnabled: parseBoolean(
      env[FEATURE_ENV_KEYS.isOpportunitiesPlatformEnabled],
      DEFAULT_FEATURE_FLAGS.isOpportunitiesPlatformEnabled,
    ),
  };
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

    if (typeof override.isMoodleIntegrationEnabled === 'boolean') {
      result.isMoodleIntegrationEnabled = override.isMoodleIntegrationEnabled;
    }

    if (typeof override.isEDeanEnabled === 'boolean') {
      result.isEDeanEnabled = override.isEDeanEnabled;
    }

    if (typeof override.isOpportunitiesPlatformEnabled === 'boolean') {
      result.isOpportunitiesPlatformEnabled = override.isOpportunitiesPlatformEnabled;
    }
  }

  return result;
};
