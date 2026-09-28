import { uk } from './locales/uk';
import { en } from './locales/en';

export type AppLanguage = 'uk' | 'en';

export const TRANSLATIONS = {
  uk,
  en,
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.uk;

export const LOCALE_TAGS: Record<AppLanguage, string> = {
  uk: 'uk-UA',
  en: 'en-US',
} as const;

export function getLocaleTag(language: AppLanguage): string {
  return LOCALE_TAGS[language] ?? LOCALE_TAGS.uk;
}

export { uk, en };
