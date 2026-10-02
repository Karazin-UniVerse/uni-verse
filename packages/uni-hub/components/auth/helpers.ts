import type { TranslationKey } from '@uni-hub/i18n/translations';

export const LinkMoodleMode = {
  CONNECT: 'connect',
  CHANGE: 'change',
} as const;

export type LinkMoodleMode = (typeof LinkMoodleMode)[keyof typeof LinkMoodleMode];

export interface LinkMoodleConfig {
  titleKey: TranslationKey;
  hintKey: TranslationKey;
  submitKey: TranslationKey;
  successKey: TranslationKey;
}

export function getLinkMoodleConfig(
  mode: LinkMoodleMode = LinkMoodleMode.CONNECT,
): LinkMoodleConfig {
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
