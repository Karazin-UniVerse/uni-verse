import React from 'react';
import { Sun, Moon, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useTheme, type AppTheme } from './ThemeContext';
import styles from './ThemeSwitcher.module.scss';

const THEME_META: Record<AppTheme, { label: string; icon: React.ReactNode }> = {
  light: { label: 'Світла', icon: <Sun size={18} /> },
  dark: { label: 'Темна', icon: <Moon size={18} /> },
  cyberpunk: { label: 'Cyberpunk', icon: <Zap size={18} /> },
};

type ThemeSwitcherProps = {
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
};

export const ThemeSwitcher: React.FC<Readonly<ThemeSwitcherProps>> = ({
  className,
  compact = false,
  showLabel = true,
}) => {
  const { theme, setTheme, cycleTheme } = useTheme();

  if (compact) {
    const themeMetadata = THEME_META[theme];

    return (
      <button
        type="button"
        className={clsx(styles.compactBtn, className)}
        onClick={cycleTheme}
        aria-label={`Тема: ${themeMetadata.label}. Перемкнути`}
        title={themeMetadata.label}
        // intentional: suppressHydrationWarning – themeMetadata resolved client-side from stored preference; server renders default theme
        suppressHydrationWarning
      >
        {themeMetadata.icon}
        {showLabel && (
          // intentional: suppressHydrationWarning – label text derived from client-side theme state
          <span className={styles.compactLabel} suppressHydrationWarning>
            {themeMetadata.label}
          </span>
        )}
      </button>
    );
  }

  return (
    <fieldset className={clsx(styles.switcher, className)} aria-label="Вибір теми">
      {(Object.keys(THEME_META) as AppTheme[]).map((themeOption) => {
        const themeMetadata = THEME_META[themeOption];
        const isSelectedTheme = theme === themeOption;

        return (
          <button
            key={themeOption}
            type="button"
            className={clsx(styles.option, isSelectedTheme && styles.active)}
            onClick={() => setTheme(themeOption)}
            aria-pressed={isSelectedTheme}
            // intentional: suppressHydrationWarning – isSelectedTheme (aria-pressed) derived from client-side theme state
            suppressHydrationWarning
          >
            {themeMetadata.icon}
            <span>{themeMetadata.label}</span>
          </button>
        );
      })}
    </fieldset>
  );
};
