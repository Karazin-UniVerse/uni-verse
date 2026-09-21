import { uk, type TranslationKey, type Translations } from './locales/uk';
import { en } from './locales/en';

export type AppLanguage = 'uk' | 'en';

export const TRANSLATIONS = {
  uk,
  en,
} as const;

export { uk, en };
export type { TranslationKey, Translations };
