import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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

function readStoredTheme(): AppTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === 'light' || stored === 'dark' || stored === 'cyberpunk') {
    return stored;
  }

  return 'light';
}

export const ThemeProvider: React.FC<Readonly<{ children: React.ReactNode }>> = ({ children }) => {
  const [theme, setTheme] = useState<AppTheme>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const currentIndex = THEMES.indexOf(prevTheme);

      return THEMES[(currentIndex + 1) % THEMES.length];
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, cycleTheme }), [theme, cycleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
