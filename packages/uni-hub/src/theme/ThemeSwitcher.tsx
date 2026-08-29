import React from 'react';
import { Sun, Moon, Zap } from 'lucide-react';
import { SimpleButton } from '../design-system';
import { useTheme, type AppTheme } from './ThemeContext';
import styles from './ThemeSwitcher.module.scss';

const THEME_META: Record<AppTheme, { label: string; icon: React.ReactNode }> = {
  light: { label: 'Светлая', icon: <Sun size={18} /> },
  dark: { label: 'Тёмная', icon: <Moon size={18} /> },
  cyberpunk: { label: 'Cyberpunk', icon: <Zap size={18} /> },
};

type ThemeSwitcherProps = {
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
};

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  compact = false,
  showLabel = true,
  className,
}) => {
  const { theme, setTheme, cycleTheme } = useTheme();

  if (compact) {
    const meta = THEME_META[theme];
    return (
      <SimpleButton
        type="button"
        variant="secondary"
        size="medium"
        isTransparent
        className={className}
        onClick={cycleTheme}
        aria-label={`Тема: ${meta.label}. Переключить`}
        title={meta.label}
      >
        {meta.icon}
        {showLabel && <span className={styles.compactLabel}>{meta.label}</span>}
      </SimpleButton>
    );
  }

  return (
    <div className={`${styles.switcher} ${className ?? ''}`} role="group" aria-label="Выбор темы">
      {(Object.keys(THEME_META) as AppTheme[]).map((key) => {
        const meta = THEME_META[key];
        const active = theme === key;
        return (
          <SimpleButton
            key={key}
            type="button"
            variant={active ? 'primary' : 'secondary'}
            size="small"
            className={styles.option}
            onClick={() => setTheme(key)}
            aria-pressed={active}
          >
            {meta.icon}
            <span>{meta.label}</span>
          </SimpleButton>
        );
      })}
    </div>
  );
};
