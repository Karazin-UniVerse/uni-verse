/**
 * Feature Toggles Configuration
 *
 * Centralized feature flags for controlling functionality across environments
 * (Develop, Staging, Production). Controlled via NEXT_PUBLIC_* environment variables.
 */

export interface FeatureFlags {
  /**
   * Opportunities / Internships module toggle.
   * Enables the Opportunities section and career navigation items.
   */
  opportunities: boolean;

  /**
   * Moodle LMS integration toggle.
   * Controls synchronization and display of Moodle-dependent views:
   * courses, grades, assignments, and LMS jump links.
   */
  moodle: boolean;

  /**
   * Authentication provider toggles.
   * Controls which login mechanisms are available on the login page.
   */
  auth: {
    /** Google OAuth 2.0 Single Sign-On */
    google: boolean;
    /** Moodle credentials login (username + password) */
    moodle: boolean;
  };
}

const parseEnvBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return value.toLowerCase() === 'true' || value === '1';
};

export const features: FeatureFlags = {
  opportunities: parseEnvBoolean(process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES, false),
  moodle: parseEnvBoolean(process.env.NEXT_PUBLIC_FEATURE_MOODLE, true),
  auth: {
    google: parseEnvBoolean(
      process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED,
      Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
    ),
    moodle: parseEnvBoolean(process.env.NEXT_PUBLIC_AUTH_MOODLE_ENABLED, true),
  },
};

export const useFeatureFlags = (): FeatureFlags => features;
