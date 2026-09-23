'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { playClick } from '@uni-hub/utils/soundEffects';
import { NAV_ITEMS } from '@uni-hub/views/dashboard/layout/DashboardSidebar';
import type { NavKey } from '@uni-hub/views/dashboard/types';
import styles from './MobileBottomNav.module.scss';

interface MobileBottomNavProps {
  activeKey: NavKey;
  onSelectKey: (key: NavKey) => void;
  soundEnabled: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeKey,
  onSelectKey,
  soundEnabled,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <nav className={styles.container} aria-label="Мобільна навігація">
      <ul className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const label = formatMessage(item.labelKey);
          const shortLabel = formatMessage(item.shortLabelKey);

          return (
            <li key={item.key} className={styles.navItemWrapper}>
              <button
                type="button"
                className={`${styles.navItem} ${activeKey === item.key ? styles.active : ''}`}
                onClick={() => {
                  playClick(soundEnabled);
                  onSelectKey(item.key);
                }}
                title={label}
                aria-label={label}
              >
                {activeKey === item.key && (
                  <motion.div
                    layoutId="mobile-active-nav-pill"
                    className={styles.activePill}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={styles.iconWrapper}>{item.icon}</span>
                <span className={styles.mobileLabel}>{shortLabel}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
