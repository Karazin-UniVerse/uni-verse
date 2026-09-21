import { uk } from './locales/uk';
import { en } from './locales/en';

export type AppLanguage = 'uk' | 'en';

export const TRANSLATIONS = {
  uk,
  en,
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.uk;

export { uk, en };
