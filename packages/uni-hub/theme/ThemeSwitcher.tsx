'use client';

import React from 'react';
import { Sun, Moon, Zap, GraduationCap, Orbit, Crown, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Dropdown, DropdownOption, type PopoverPlacement } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { APP_THEMES, type AppTheme } from '@core/constants/themes';
import { useTheme } from './ThemeContext';
import styles from './ThemeSwitcher.module.scss';

const THEME_ICONS: Record<AppTheme, React.ReactNode> = {
  light: <Sun size={18} />,
  dark: <Moon size={18} />,
  cyberpunk: <Zap size={18} />,
  karazinClassic: <GraduationCap size={18} />,
  universeSpace: <Orbit size={18} />,
  karazinGold: <Crown size={18} />,
};

const THEME_KEYS: Record<AppTheme, TranslationKey> = {
  light: 'theme.light',
  dark: 'theme.dark',
  cyberpunk: 'theme.cyberpunk',
  karazinClassic: 'theme.karazinClassic',
  universeSpace: 'theme.universeSpace',
  karazinGold: 'theme.karazinGold',
};

type ThemeSwitcherProps = {
  compact?: boolean;
  showLabel?: boolean;
  placement?: PopoverPlacement;
  className?: string;
};

export const ThemeSwitcher: React.FC<Readonly<ThemeSwitcherProps>> = ({
  className,
  compact = false,
  showLabel = true,
  placement = 'bottom-end',
}) => {
  const { theme, setTheme } = useTheme();
  const { formatMessage } = useLanguage();
  const currentThemeLabel = formatMessage(THEME_KEYS[theme]);

  if (compact) {
    return (
      <Dropdown
        isPadded
        placement={placement}
        renderTrigger={(triggerProps, isOpen) => (
          <button
            {...triggerProps}
            type="button"
            className={clsx(styles.compactBtn, className)}
            aria-label={`${formatMessage('theme.select')}: ${currentThemeLabel}`}
            title={currentThemeLabel}
            // intentional: suppressHydrationWarning – currentThemeLabel resolved client-side from stored preference; server renders default theme
            suppressHydrationWarning
          >
            {THEME_ICONS[theme]}
            {showLabel && (
              <>
                {/* intentional: suppressHydrationWarning – label text derived from client-side theme state */}
                <span className={styles.compactLabel} suppressHydrationWarning>
                  {currentThemeLabel}
                </span>
                <ChevronDown
                  size={14}
                  className={clsx(styles.chevron, isOpen && styles.chevronOpen)}
                  aria-hidden
                />
              </>
            )}
          </button>
        )}
      >
        {(close) =>
          APP_THEMES.map((themeOption) => (
            <DropdownOption
              key={themeOption}
              icon={THEME_ICONS[themeOption]}
              isSelected={theme === themeOption}
              onSelect={() => {
                setTheme(themeOption);
                close();
              }}
            >
              {formatMessage(THEME_KEYS[themeOption])}
            </DropdownOption>
          ))
        }
      </Dropdown>
    );
  }

  return (
    <fieldset
      className={clsx(styles.switcher, className)}
      aria-label={formatMessage('theme.select')}
    >
      {APP_THEMES.map((themeOption) => {
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
