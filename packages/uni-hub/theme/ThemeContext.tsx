import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { APP_THEMES, THEME_COLOR_SCHEME, type AppTheme } from '@core/constants/themes';

const STORAGE_KEY = 'universe-theme';

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

const subscribeToTheme = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener('theme-change', callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('theme-change', callback);
  };
};

const getThemeSnapshot = (): AppTheme => {
  const stored = localStorage.getItem(STORAGE_KEY);

  const storedTheme = APP_THEMES.find((appTheme: AppTheme) => appTheme === stored);

  if (storedTheme) {
    return storedTheme;
  }

  return 'light';
};

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
