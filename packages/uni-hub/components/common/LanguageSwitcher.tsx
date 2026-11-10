'use client';

import React from 'react';
import { Languages, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Dropdown, DropdownOption, type PopoverPlacement } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { AppLanguage } from '@uni-hub/i18n/translations';
import styles from './LanguageSwitcher.module.scss';

const LANGUAGES: Array<{ code: AppLanguage; label: string; shortLabel: string; flag: string }> = [
  { code: 'uk', label: 'Українська', shortLabel: 'УКР', flag: '🇺🇦' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧' },
];

export type LanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
  isFullWidth?: boolean;
  placement?: PopoverPlacement;
  showLabel?: boolean;
  variant?: 'default' | 'glass' | 'sider';
};

export const LanguageSwitcher: React.FC<Readonly<LanguageSwitcherProps>> = ({
  className,
  compact = false,
  isFullWidth = false,
  placement = 'bottom-end',
  showLabel = true,
  variant = 'default',
}) => {
  const { language, setLanguage, formatMessage } = useLanguage();

  const activeLanguage = LANGUAGES.find((lang) => lang.code === language) || LANGUAGES[0];

  const isCollapsed = compact && !showLabel;

  return (
    <Dropdown
      className={className}
      isFullWidth={isFullWidth || variant === 'sider'}
      isPadded
      placement={placement}
      renderTrigger={(triggerProps, isOpen) => (
        <button
          {...triggerProps}
          type="button"
          data-lang-trigger
          className={clsx(
            styles.trigger,
            variant === 'glass' && styles.glassTrigger,
            variant === 'sider' && styles.siderTrigger,
            isFullWidth && styles.fullWidthTrigger,
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
              <span suppressHydrationWarning className={styles.labelFull} data-lang-label="full">
                {activeLanguage.label}
              </span>
              <span
                suppressHydrationWarning
                className={styles.labelShort}
                data-lang-label="short"
                aria-hidden
              >
                {activeLanguage.shortLabel}
              </span>
              <ChevronDown
                size={14}
                className={clsx(styles.chevron, isOpen && styles.chevronOpen)}
                data-lang-chevron
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
