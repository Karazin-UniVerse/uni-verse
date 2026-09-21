'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { TRANSLATIONS, type AppLanguage, type TranslationKey } from './translations';

const STORAGE_KEY = 'universe-lang';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const subscribeToLanguage = (callback: () => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('storage', callback);
  window.addEventListener('language-change', callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('language-change', callback);
  };
};

const getLanguageSnapshot = (): AppLanguage => {
  if (typeof window === 'undefined') {
    return 'uk';
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === 'uk' || stored === 'en') {
    return stored;
  }

  return 'uk';
};

const getLanguageServerSnapshot = (): AppLanguage => 'uk';

export const LanguageProvider: React.FC<Readonly<{ children: React.ReactNode }>> = ({
  children,
}) => {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getLanguageServerSnapshot,
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((next: AppLanguage) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new Event('language-change'));
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const dict = TRANSLATIONS[language] || TRANSLATIONS.uk;

      return dict[key] || TRANSLATIONS.uk[key] || key;
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
}
