import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

export type AppTheme = 'light' | 'dark' | 'cyberpunk';

const STORAGE_KEY = 'universe-theme';

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEMES: AppTheme[] = ['light', 'dark', 'cyberpunk'];

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;

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

  if (stored === 'light' || stored === 'dark' || stored === 'cyberpunk') {
    return stored;
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

  const cycleTheme = useCallback(() => {
    const currentTheme = getThemeSnapshot();
    const currentThemeIndex = THEMES.indexOf(currentTheme);
    const nextTheme = THEMES[(currentThemeIndex + 1) % THEMES.length];

    setTheme(nextTheme);
  }, [setTheme]);

  const value = useMemo(() => ({ theme, setTheme, cycleTheme }), [theme, setTheme, cycleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
