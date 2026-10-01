/**
 * @universe/core/utils/features
 * Helper functions for resolving and parsing feature flags.
 */

import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_ENV_KEYS,
  FEATURE_QUERY_PARAMS,
  type FeatureFlags,
  type FeatureFlagKey,
} from '../constants/features.ts';

/**
 * Parses boolean representations (true, 'true', '1', 'yes', 'on').
 */
export const parseBooleanFlag = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();

    if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes' || trimmed === 'on') {
      return true;
    }

    if (trimmed === 'false' || trimmed === '0' || trimmed === 'no' || trimmed === 'off') {
      return false;
    }
  }

  return fallback;
};

/**
 * Resolves feature flags from environment variables.
 */
export const resolveEnvFeatureFlags = (
  env: Record<string, string | undefined> = {},
): FeatureFlags => {
  return {
    isMoodleIntegrationEnabled: parseBooleanFlag(
      env[FEATURE_ENV_KEYS.isMoodleIntegrationEnabled],
      DEFAULT_FEATURE_FLAGS.isMoodleIntegrationEnabled,
    ),
    isEDeanEnabled: parseBooleanFlag(
      env[FEATURE_ENV_KEYS.isEDeanEnabled],
      DEFAULT_FEATURE_FLAGS.isEDeanEnabled,
    ),
    isOpportunitiesPlatformEnabled: parseBooleanFlag(
      env[FEATURE_ENV_KEYS.isOpportunitiesPlatformEnabled],
      DEFAULT_FEATURE_FLAGS.isOpportunitiesPlatformEnabled,
    ),
  };
};

/**
 * Parses feature flag overrides from URL query parameters.
 * Supports individual keys: ?ft_moodle=true&ft_opportunities=false
 * Also supports shortcut lists: ?features=moodle,opportunities or ?disable=moodle
 */
export const parseFeatureQueryParams = (input: string | URLSearchParams): Partial<FeatureFlags> => {
  const overrides: Partial<FeatureFlags> = {};
  const params =
    input instanceof URLSearchParams
      ? input
      : new URLSearchParams(input.startsWith('?') ? input.slice(1) : input);

  for (const [flagKey, paramName] of Object.entries(FEATURE_QUERY_PARAMS) as [
    FeatureFlagKey,
    string,
  ][]) {
    if (params.has(paramName)) {
      overrides[flagKey] = parseBooleanFlag(params.get(paramName), DEFAULT_FEATURE_FLAGS[flagKey]);
    }
  }

  const featuresParam = params.get('features');

  if (featuresParam) {
    const enabledList = featuresParam
      .toLowerCase()
      .split(',')
      .map((token) => token.trim());

    if (enabledList.includes('moodle')) {
      overrides.isMoodleIntegrationEnabled = true;
    }

    if (enabledList.includes('edean') || enabledList.includes('dean')) {
      overrides.isEDeanEnabled = true;
    }

    if (enabledList.includes('opportunities') || enabledList.includes('opps')) {
      overrides.isOpportunitiesPlatformEnabled = true;
    }
  }

  const disableParam = params.get('disable');

  if (disableParam) {
    const disabledList = disableParam
      .toLowerCase()
      .split(',')
      .map((token) => token.trim());

    if (disabledList.includes('moodle')) {
      overrides.isMoodleIntegrationEnabled = false;
    }

    if (disabledList.includes('edean') || disabledList.includes('dean')) {
      overrides.isEDeanEnabled = false;
    }

    if (disabledList.includes('opportunities') || disabledList.includes('opps')) {
      overrides.isOpportunitiesPlatformEnabled = false;
    }
  }

  return overrides;
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
