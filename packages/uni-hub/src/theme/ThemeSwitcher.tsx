import React from 'react';
import { Sun, Moon, Zap } from 'lucide-react';
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
  compact = false,
  showLabel = true,
  className,
}) => {
  const { theme, setTheme, cycleTheme } = useTheme();

  if (compact) {
    const meta = THEME_META[theme];
    return (
      <button
        type="button"
        className={`${styles.compactBtn ?? ''} ${className ?? ''}`}
        onClick={cycleTheme}
        aria-label={`Тема: ${meta.label}. Перемкнути`}
        title={meta.label}
      >
        {meta.icon}
        {showLabel && <span className={styles.compactLabel}>{meta.label}</span>}
      </button>
    );
  }

  return (
    <div className={`${styles.switcher} ${className ?? ''}`} role="group" aria-label="Вибір теми">
      {(Object.keys(THEME_META) as AppTheme[]).map((key) => {
        const meta = THEME_META[key];
        const active = theme === key;
        return (
          <button
            key={key}
            type="button"
            className={`${styles.option} ${active ? styles.active : ''}`}
            onClick={() => setTheme(key)}
            aria-pressed={active}
          >
            {meta.icon}
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
};
