import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { APP_THEMES, THEME_COLOR_SCHEME, type AppTheme } from '@core/constants/themes';
import { isBrowser } from '@uni-hub/utils/browser';

const STORAGE_KEY = 'universe-theme';

/** Media query used to detect the OS colour-scheme preference. */
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;

  root.dataset.colorScheme = THEME_COLOR_SCHEME[theme];

  if (theme === 'light') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
}

const canUseMatchMedia = (): boolean => isBrowser && typeof window.matchMedia === 'function';

/**
 * Returns the system-preference default theme when the user has not saved a choice:
 *   dark OS preference  → 'karazinGold'
 *   light OS preference → 'karazinClassic'
 */
const getSystemTheme = (): AppTheme => {
  if (!canUseMatchMedia()) {
    return 'karazinClassic';
  }

  return window.matchMedia(DARK_SCHEME_QUERY).matches ? 'karazinGold' : 'karazinClassic';
};

/**
 * Subscribe to MediaQueryList changes. Browsers that lack addEventListener on
 * MediaQueryList (e.g. Safari < 14) are skipped instead of throwing; the OS theme
 * is still read on load.
 */
const subscribeToMediaQuery = (media: MediaQueryList, callback: () => void) => {
  if (typeof media.addEventListener !== 'function') {
    return undefined;
  }

  media.addEventListener('change', callback);

  return () => media.removeEventListener('change', callback);
};

/**
 * Subscribe to all sources that can change the active theme:
 *   - localStorage writes from other tabs ('storage')
 *   - in-tab theme changes dispatched by setTheme ('theme-change')
 *   - OS colour-scheme changes (matchMedia 'change')
 */
const subscribeToTheme = (callback: () => void) => {
  const unsubscribeMedia = canUseMatchMedia()
    ? subscribeToMediaQuery(window.matchMedia(DARK_SCHEME_QUERY), callback)
    : undefined;

  window.addEventListener('storage', callback);
  window.addEventListener('theme-change', callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('theme-change', callback);
    unsubscribeMedia?.();
  };
};

/**
 * Client snapshot: return the stored user preference if one exists,
 * otherwise fall back to the OS colour-scheme default.
 * The OS fallback is only used when the user has never explicitly chosen a theme.
 */
const getThemeSnapshot = (): AppTheme => {
  const stored = localStorage.getItem(STORAGE_KEY);

  const storedTheme = APP_THEMES.find((appTheme: AppTheme) => appTheme === stored);

  if (storedTheme) {
    return storedTheme;
  }

  return getSystemTheme();
};

/**
 * Server snapshot: always return 'light' so SSR produces deterministic HTML.
 * The server cannot know the OS colour scheme, so theme-dependent UI (for example
 * the ThemeSwitcher label and icon) is hidden until mount and never shows this
 * placeholder value to the user.
 * The root attributes (data-theme / data-color-scheme) are set before first paint by
 * the inline script in layout.tsx; <html> has suppressHydrationWarning for that reason.
 */
const getThemeServerSnapshot = (): AppTheme => 'light';

export const ThemeProvider: React.FC<Readonly<{ children: React.ReactNode }>> = ({ children }) => {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeServerSnapshot);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: AppTheme) => {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event('theme-change'));
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
