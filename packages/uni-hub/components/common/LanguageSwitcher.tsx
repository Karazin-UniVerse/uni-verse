'use client';

import React, { useState } from 'react';
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
  placement?: 'auto' | 'bottom-up' | 'top-down' | 'bottom-up-left' | 'top-down-left';
  className?: string;
};

type ResolvedPlacement = 'top-down' | 'bottom-up' | 'bottom-up-left' | 'top-down-left';

const PANEL_PLACEMENTS: Record<ResolvedPlacement, PopoverPlacement> = {
  'top-down': 'bottom-end',
  'bottom-up': 'top-end',
  'top-down-left': 'bottom-start',
  'bottom-up-left': 'top-start',
};

function getInitialPlacement(placement: LanguageSwitcherProps['placement']): ResolvedPlacement {
  if (
    placement === 'bottom-up' ||
    placement === 'bottom-up-left' ||
    placement === 'top-down-left'
  ) {
    return placement;
  }

  return 'top-down';
}

function resolveDropdownPlacement(
  placement: LanguageSwitcherProps['placement'],
  rect: DOMRect,
  windowHeight: number,
): ResolvedPlacement {
  if (placement === 'top-down' || placement === 'top-down-left') {
    return placement;
  }

  const spaceAbove = rect.top;
  const spaceBelow = windowHeight - rect.bottom;
  const minHeight = 110;
  const shouldFlipDown = spaceAbove < minHeight && spaceBelow > spaceAbove;

  if (placement === 'bottom-up-left') {
    return shouldFlipDown ? 'top-down-left' : 'bottom-up-left';
  }

  if (placement === 'bottom-up') {
    return shouldFlipDown ? 'top-down' : 'bottom-up';
  }

  return spaceAbove >= minHeight && spaceBelow < minHeight ? 'bottom-up' : 'top-down';
}

export const LanguageSwitcher: React.FC<Readonly<LanguageSwitcherProps>> = ({
  className,
  compact = false,
  showLabel = true,
  variant = 'default',
  placement = 'auto',
}) => {
  const { language, setLanguage, formatMessage } = useLanguage();
  const [resolvedPlacement, setResolvedPlacement] = useState<ResolvedPlacement>(() =>
    getInitialPlacement(placement),
  );

  const activeLanguage = LANGUAGES.find((lang) => lang.code === language) || LANGUAGES[0];

  const updatePlacement = (trigger: HTMLElement) => {
    const rect = trigger.getBoundingClientRect();

    setResolvedPlacement(resolveDropdownPlacement(placement, rect, window.innerHeight));
  };

  const isCollapsed = compact && !showLabel;

  return (
    <Dropdown
      className={className}
      isFullWidth={variant === 'sider'}
      isPadded
      panelLabel={formatMessage('lang.select')}
      panelRole="listbox"
      placement={PANEL_PLACEMENTS[resolvedPlacement]}
      trigger={(triggerProps, isOpen) => (
        <button
          {...triggerProps}
          type="button"
          className={clsx(
            styles.trigger,
            variant === 'glass' && styles.glassTrigger,
            variant === 'sider' && styles.siderTrigger,
            isCollapsed && styles.collapsedTrigger,
          )}
          onClick={(event) => {
            if (!isOpen) {
              updatePlacement(event.currentTarget);
            }

            triggerProps.onClick(event);
          }}
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
