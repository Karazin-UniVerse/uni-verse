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

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
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
        suppressHydrationWarning
      >
        {themeMetadata.icon}
        {showLabel && (
          <span className={styles.compactLabel} suppressHydrationWarning>
            {themeMetadata.label}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={clsx(styles.switcher, className)} suppressHydrationWarning>
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
            suppressHydrationWarning
          >
            {themeMetadata.icon}
            <span>{themeMetadata.label}</span>
          </button>
        );
      })}
    </div>
  );
};
