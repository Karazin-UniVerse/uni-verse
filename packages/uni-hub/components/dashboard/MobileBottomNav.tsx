'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useFeatures } from '@uni-hub/features';
import { playClick } from '@uni-hub/utils/soundEffects';
import { getVisibleNavItems } from '@uni-hub/views/dashboard/layout/DashboardSidebar';
import { partitionNavItems, isSecondaryActive } from './MobileBottomNav.helpers';
import { MobileMoreSheet } from './MobileMoreSheet';
import type { MobileBottomNavProps } from './MobileBottomNav.types';
import styles from './MobileBottomNav.module.scss';

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeKey,
  onSelectKey,
  soundEnabled,
  onLogout,
  onToggleSound,
  isMoodleLinked = true,
}) => {
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const { formatMessage } = useLanguage();
  const flags = useFeatures();

  const visibleNavItems = getVisibleNavItems(flags, isMoodleLinked);
  const { primaryItems, secondaryItems } = partitionNavItems(visibleNavItems);

  const isSecondaryActiveItem = isSecondaryActive(activeKey, secondaryItems);
  const isMoreActive = isMoreSheetOpen || isSecondaryActiveItem;

  return (
    <>
      <nav className={styles.container} aria-label={formatMessage('header.openMenu')}>
        <ul className={styles.nav}>
          {primaryItems.map((item) => {
            const label = formatMessage(item.labelKey);
            const shortLabel = formatMessage(item.shortLabelKey ?? item.labelKey);
            const isActive = activeKey === item.key && !isMoreSheetOpen;

            return (
              <li key={item.key} className={styles.navItemWrapper}>
                <button
                  type="button"
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  onClick={() => {
                    playClick(soundEnabled);
                    setIsMoreSheetOpen(false);
                    onSelectKey(item.key);
                  }}
                  title={label}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
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

          <li className={styles.navItemWrapper}>
            <button
              type="button"
              className={`${styles.navItem} ${isMoreActive ? styles.active : ''}`}
              onClick={() => {
                playClick(soundEnabled);
                setIsMoreSheetOpen((previous) => !previous);
              }}
              title={formatMessage('nav.more')}
              aria-label={formatMessage('nav.more')}
              aria-expanded={isMoreSheetOpen}
              aria-haspopup="dialog"
            >
              {isMoreActive && (
                <motion.div
                  layoutId="mobile-active-nav-pill"
                  className={styles.activePill}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={styles.iconWrapper}>
                <LayoutGrid size={18} />
                {isSecondaryActiveItem && <span className={styles.moreIndicator} aria-hidden />}
              </span>
              <span className={styles.mobileLabel}>{formatMessage('nav.more')}</span>
            </button>
          </li>
        </ul>
      </nav>

      <MobileMoreSheet
        open={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        activeKey={activeKey}
        onSelectKey={onSelectKey}
        secondaryItems={secondaryItems}
        soundEnabled={soundEnabled}
        onLogout={onLogout}
        onToggleSound={onToggleSound}
      />
    </>
  );
};
