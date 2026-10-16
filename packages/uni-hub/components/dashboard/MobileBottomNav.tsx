'use client';

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useFeatures } from '@uni-hub/features';
import type { FeatureFlags } from '@core/constants/features';
import { playClick } from '@uni-hub/utils/soundEffects';
import {
  getVisibleNavItems,
  type NavItemConfig,
} from '@uni-hub/views/dashboard/layout/DashboardSidebar';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import type { NavKey } from '@uni-hub/views/dashboard/constants';
import styles from './MobileBottomNav.module.scss';

export interface MobileBottomNavItem {
  key: NavKey;
  icon?: React.ReactNode;
  label?: string;
  shortLabel?: string;
  labelKey?: TranslationKey;
  shortLabelKey?: TranslationKey;
  badge?: React.ReactNode | number | boolean;
}

export interface MobileBottomNavProps {
  activeKey?: NavKey;
  activeTab?: NavKey;
  badges?: Record<string, React.ReactNode | number | boolean>;
  className?: string;
  flags?: FeatureFlags;
  isMoodleLinked?: boolean;
  items?: (NavItemConfig | MobileBottomNavItem)[];
  onSelectKey?: (key: NavKey) => void;
  onTabChange?: (key: NavKey) => void;
  soundEnabled?: boolean;
  tabs?: (NavItemConfig | MobileBottomNavItem)[];
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeKey,
  activeTab,
  badges,
  className,
  flags,
  items,
  onSelectKey,
  onTabChange,
  tabs,
  isMoodleLinked = true,
  soundEnabled = false,
}) => {
  const { formatMessage } = useLanguage();
  const contextFlags = useFeatures();
  const currentKey = activeTab ?? activeKey;
  const effectiveFlags = flags ?? contextFlags;
  const visibleNavItems = tabs ?? items ?? getVisibleNavItems(effectiveFlags, isMoodleLinked);

  return (
    <nav className={clsx(styles.container, className)} aria-label="Мобільна навігація">
      <ul className={styles.nav}>
        {visibleNavItems.map((item) => {
          const customItem = item as MobileBottomNavItem;
          const label =
            customItem.label ?? (item.labelKey ? formatMessage(item.labelKey) : String(item.key));
          const shortLabel =
            customItem.shortLabel ??
            (item.shortLabelKey ? formatMessage(item.shortLabelKey) : label);
          const isActive = currentKey === item.key;
          const badge = badges?.[item.key] ?? customItem.badge;
          const isConnect = item.key === 'connectMoodle';

          return (
            <li key={item.key} className={styles.navItemWrapper}>
              <button
                type="button"
                className={clsx(styles.navItem, isActive && styles.active)}
                onClick={() => {
                  playClick(soundEnabled);
                  onSelectKey?.(item.key);
                  onTabChange?.(item.key);
                }}
                title={label}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                aria-selected={isActive}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-active-nav-pill"
                    className={styles.activePill}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {item.icon && <span className={styles.iconWrapper}>{item.icon}</span>}
                <span className={styles.mobileLabel}>{shortLabel}</span>
                {badge !== undefined &&
                  badge !== null &&
                  badge !== false &&
                  (typeof badge === 'boolean' ? (
                    <span
                      className={styles.indicator}
                      data-testid={`badge-${item.key}`}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className={styles.badge} data-testid={`badge-${item.key}`}>
                      {badge}
                    </span>
                  ))}
                {badge === undefined && isConnect && !isMoodleLinked && (
                  <span
                    className={styles.indicator}
                    data-testid={`badge-${item.key}`}
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
