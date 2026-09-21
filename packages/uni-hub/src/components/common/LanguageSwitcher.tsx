'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Languages, ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { AppLanguage } from '@uni-hub/i18n/translations';
import styles from './LanguageSwitcher.module.scss';

const LANGUAGES: Array<{ code: AppLanguage; label: string; flag: string }> = [
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export type LanguageSwitcherProps = {
  compact?: boolean;
  showLabel?: boolean;
  variant?: 'default' | 'glass' | 'sider';
  placement?: 'bottom-up' | 'top-down' | 'bottom-up-left';
  className?: string;
};

export const LanguageSwitcher: React.FC<Readonly<LanguageSwitcherProps>> = ({
  className,
  compact = false,
  showLabel = true,
  variant = 'default',
  placement = 'bottom-up',
}) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLanguage = LANGUAGES.find((lang) => lang.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code: AppLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  const getDropdownPlacementClass = () => {
    if (placement === 'bottom-up-left') {
      return styles.dropUpLeft;
    }

    if (placement === 'top-down') {
      return styles.dropDown;
    }

    return styles.dropUp;
  };

  const isCollapsed = compact && !showLabel;

  return (
    <div
      ref={containerRef}
      className={clsx(styles.wrapper, variant === 'sider' && styles.fullWidth, className)}
    >
      <button
        type="button"
        className={clsx(
          styles.trigger,
          variant === 'glass' && styles.glassTrigger,
          variant === 'sider' && styles.siderTrigger,
          isCollapsed && styles.collapsedTrigger,
        )}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Вибір мови: ${activeLanguage.label}`}
        title={`Мова: ${activeLanguage.label}`}
        suppressHydrationWarning
      >
        <Languages size={18} aria-hidden />
        {showLabel && (
          <>
            <span suppressHydrationWarning>{activeLanguage.label}</span>
            <ChevronDown
              size={14}
              className={clsx(styles.chevron, isOpen && styles.chevronOpen)}
              aria-hidden
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={clsx(styles.dropdown, getDropdownPlacementClass())}
          role="listbox"
          aria-label="Оберіть мову"
        >
          {LANGUAGES.map((item) => {
            const isSelected = item.code === language;

            return (
              <button
                key={item.code}
                type="button"
                className={clsx(styles.option, isSelected && styles.active)}
                onClick={() => handleSelect(item.code)}
                role="option"
                aria-selected={isSelected}
              >
                <span className={styles.flag} aria-hidden>
                  {item.flag}
                </span>
                <span>{item.label}</span>
                {isSelected && <Check size={16} className={styles.checkIcon} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
