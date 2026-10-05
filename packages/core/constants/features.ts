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
 * Production default: Moodle enabled, Opportunities disabled, eDean enabled.
 */
export const DEFAULT_FEATURE_FLAGS: Readonly<FeatureFlags> = Object.freeze({
  isMoodleIntegrationEnabled: true,
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
