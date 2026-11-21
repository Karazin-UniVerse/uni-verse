import { AUTH_ERROR } from '@core/constants/auth';
import type { FormatMessage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { getErrorMessage } from '@uni-hub/services/api';

// Matches the legacy Ukrainian backend message when running against an older API build.
const LEGACY_CORPORATE_DOMAIN_ERROR =
  'Доступ дозволено лише для облікових записів @student.karazin.ua та @karazin.ua';

const AUTH_ERROR_KEY_MAP: Record<string, TranslationKey> = {
  [AUTH_ERROR.CORPORATE_DOMAIN_REQUIRED]: AUTH_ERROR.CORPORATE_DOMAIN_REQUIRED,
  [LEGACY_CORPORATE_DOMAIN_ERROR]: AUTH_ERROR.CORPORATE_DOMAIN_REQUIRED,
  [AUTH_ERROR.MOODLE_ALREADY_LINKED]: AUTH_ERROR.MOODLE_ALREADY_LINKED,
};

/**
 * Resolves a human-readable, localized error message for auth mutations.
 */
export function getAuthErrorMessage(
  error: unknown,
  formatMessage: FormatMessage,
  fallback: string,
): string {
  const message = getErrorMessage(error, fallback);
  const translationKey = AUTH_ERROR_KEY_MAP[message];

  return translationKey ? formatMessage(translationKey) : message;
}

export const LinkMoodleMode = {
  CONNECT: 'connect',
  CHANGE: 'change',
} as const;

export type LinkMoodleMode = (typeof LinkMoodleMode)[keyof typeof LinkMoodleMode];

export interface LinkMoodleContentKeys {
  titleKey: TranslationKey;
  hintKey: TranslationKey;
  submitKey: TranslationKey;
  successKey: TranslationKey;
}

/**
 * Resolves the localized text keys for the Moodle link modal.
 */
export function getLinkMoodleContentKeys(
  mode: LinkMoodleMode = LinkMoodleMode.CONNECT,
): LinkMoodleContentKeys {
  const isChange = mode === LinkMoodleMode.CHANGE;

  return {
    titleKey: isChange ? 'login.changeMoodleTitle' : 'login.linkMoodleTitle',
    hintKey: isChange ? 'login.changeMoodleHint' : 'login.linkMoodleHint',
    submitKey: isChange ? 'login.changeMoodleSubmit' : 'login.linkMoodleSubmit',
    successKey: isChange ? 'login.changeMoodleSuccess' : 'login.linkMoodleSuccess',
  };
}

export interface GoogleJwtClaims {
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Decodes the payload of a Google OAuth ID token into structured JWT claims.
 */
export const parseGoogleClaims = (token: string): GoogleJwtClaims => {
  try {
    const parts = token.split('.');

    if (parts.length < 2) {
      return {};
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => '%' + ('00' + (char.codePointAt(0) ?? 0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload) as GoogleJwtClaims;
  } catch {
    return {};
  }
};

/**
 * Extracts a display full name from Google JWT claims, falling back to combined given and family names.
 */
export function extractGoogleDisplayName(claims: GoogleJwtClaims): string {
  const directName = claims.name?.trim();

  if (directName) {
    return directName;
  }

  return [claims.given_name?.trim(), claims.family_name?.trim()].filter(Boolean).join(' ');
}

export const GOOGLE_BUTTON_FALLBACK_WIDTH = 336;
export const GOOGLE_BUTTON_MIN_WIDTH = 200;
export const GOOGLE_BUTTON_MAX_WIDTH = 400;

/**
 * Calculates a valid Google Identity Services button width based on available container width.
 * GIS accepts only integer pixel values between 200 and 400.
 */
export function resolveGoogleButtonWidth(measuredWidth?: number | null): number {
  if (typeof measuredWidth !== 'number' || Number.isNaN(measuredWidth) || measuredWidth <= 0) {
    return GOOGLE_BUTTON_FALLBACK_WIDTH;
  }

  return Math.max(
    GOOGLE_BUTTON_MIN_WIDTH,
    Math.min(GOOGLE_BUTTON_MAX_WIDTH, Math.floor(measuredWidth)),
  );
}
