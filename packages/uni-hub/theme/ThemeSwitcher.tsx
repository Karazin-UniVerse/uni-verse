'use client';

import React from 'react';
import { Sun, Moon, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { useTheme, type AppTheme } from './ThemeContext';
import styles from './ThemeSwitcher.module.scss';

const THEME_ICONS: Record<AppTheme, React.ReactNode> = {
  light: <Sun size={18} />,
  dark: <Moon size={18} />,
  cyberpunk: <Zap size={18} />,
};

const THEME_KEYS: Record<AppTheme, TranslationKey> = {
  light: 'theme.light',
  dark: 'theme.dark',
  cyberpunk: 'theme.cyberpunk',
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
  const { formatMessage } = useLanguage();

  const currentThemeLabel = formatMessage(THEME_KEYS[theme]);

  if (compact) {
    return (
      <button
        type="button"
        className={clsx(styles.compactBtn, className)}
        onClick={cycleTheme}
        aria-label={`${formatMessage('theme.select')}: ${currentThemeLabel}`}
        title={currentThemeLabel}
        // intentional: suppressHydrationWarning – currentThemeLabel resolved client-side from stored preference; server renders default theme
        suppressHydrationWarning
      >
        {THEME_ICONS[theme]}
        {showLabel && (
          // intentional: suppressHydrationWarning – label text derived from client-side theme state
          <span className={styles.compactLabel} suppressHydrationWarning>
            {currentThemeLabel}
          </span>
        )}
      </button>
    );
  }

  return (
    <fieldset
      className={clsx(styles.switcher, className)}
      aria-label={formatMessage('theme.select')}
    >
      {(Object.keys(THEME_ICONS) as AppTheme[]).map((themeOption) => {
        const isSelectedTheme = theme === themeOption;
        const optionLabel = formatMessage(THEME_KEYS[themeOption]);

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
            {THEME_ICONS[themeOption]}
            <span>{optionLabel}</span>
          </button>
        );
      })}
    </fieldset>
  );
};
