/**
 * @universe/core/constants/features
 * Canonical feature toggles definitions, types, and defaults.
 */

export interface FeatureFlags {
  /** Enables Moodle LMS sync (assignments, grades/scores, individual study plan, student card GPA/avatar) */
  isMoodleIntegrationEnabled: boolean;
  /** Enables eDean system features (academic schedule, student academic standing/card attributes) */
  isEDeanEnabled: boolean;
  /** Enables Opportunities & Internships board platform */
  isOpportunitiesPlatformEnabled: boolean;
}

export type FeatureFlagKey = keyof FeatureFlags;

/**
 * Baseline default values for feature flags.
 * Production default: Moodle disabled, Opportunities disabled, eDean enabled.
 */
export const DEFAULT_FEATURE_FLAGS: Readonly<FeatureFlags> = Object.freeze({
  isMoodleIntegrationEnabled: false,
  isEDeanEnabled: true,
  isOpportunitiesPlatformEnabled: false,
});

/**
 * Environment variable mappings for client-side bundle injection (Next.js).
 */
export const FEATURE_ENV_KEYS: Readonly<Record<FeatureFlagKey, string>> = Object.freeze({
  isMoodleIntegrationEnabled: 'NEXT_PUBLIC_FEATURE_MOODLE',
  isEDeanEnabled: 'NEXT_PUBLIC_FEATURE_EDEAN',
  isOpportunitiesPlatformEnabled: 'NEXT_PUBLIC_FEATURE_OPPORTUNITIES',
});

/**
 * Query parameter keys used for on-the-fly QA and developer testing overrides.
 */
export const FEATURE_QUERY_PARAMS: Readonly<Record<FeatureFlagKey, string>> = Object.freeze({
  isMoodleIntegrationEnabled: 'ft_moodle',
  isEDeanEnabled: 'ft_edean',
  isOpportunitiesPlatformEnabled: 'ft_opportunities',
});

/**
 * LocalStorage key for storing user/testing overrides in safeStorage.
 */
export const FEATURE_OVERRIDES_STORAGE_KEY = 'universe_feature_overrides';
