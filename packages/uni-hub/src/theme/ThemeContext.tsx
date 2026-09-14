import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storedTheme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );
  const [overrideTheme, setOverrideTheme] = useState<AppTheme | null>(null);
  const theme = overrideTheme ?? storedTheme;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: AppTheme) => {
    setOverrideTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event('theme-change'));
  }, []);

  const cycleTheme = useCallback(() => {
    const currentTheme = overrideTheme ?? getThemeSnapshot();
    const idx = THEMES.indexOf(currentTheme);
    const nextTheme = THEMES[(idx + 1) % THEMES.length];

    setTheme(nextTheme);
  }, [overrideTheme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, cycleTheme }), [theme, setTheme, cycleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return ctx;
}
