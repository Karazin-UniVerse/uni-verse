'use client';

import React from 'react';
import { Languages, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Dropdown, DropdownOption, type PopoverPlacement } from '@una';
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
  placement?: PopoverPlacement;
  className?: string;
};

export const LanguageSwitcher: React.FC<Readonly<LanguageSwitcherProps>> = ({
  className,
  compact = false,
  showLabel = true,
  variant = 'default',
  placement = 'bottom-end',
}) => {
  const { language, setLanguage, formatMessage } = useLanguage();

  const activeLanguage = LANGUAGES.find((lang) => lang.code === language) || LANGUAGES[0];

  const isCollapsed = compact && !showLabel;

  return (
    <Dropdown
      className={className}
      isFullWidth={variant === 'sider'}
      isPadded
      placement={placement}
      renderTrigger={(triggerProps, isOpen) => (
        <button
          {...triggerProps}
          type="button"
          className={clsx(
            styles.trigger,
            variant === 'glass' && styles.glassTrigger,
            variant === 'sider' && styles.siderTrigger,
            isCollapsed && styles.collapsedTrigger,
          )}
          aria-label={`${formatMessage('lang.select')}: ${activeLanguage.label}`}
          title={`${formatMessage('lang.select')}: ${activeLanguage.label}`}
          // intentional: suppressHydrationWarning – activeLanguage resolved client-side from stored preference; server renders default language
          suppressHydrationWarning
        >
          <Languages size={18} aria-hidden />
          {showLabel && (
            <>
              {/* intentional: suppressHydrationWarning – label text derived from client-side language state */}
              <span suppressHydrationWarning>{activeLanguage.label}</span>
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
        LANGUAGES.map((item) => (
          <DropdownOption
            key={item.code}
            icon={item.flag}
            isSelected={item.code === language}
            onSelect={() => {
              setLanguage(item.code);
              close();
            }}
          >
            {item.label}
          </DropdownOption>
        ))
      }
    </Dropdown>
  );
};

export default LanguageSwitcher;
