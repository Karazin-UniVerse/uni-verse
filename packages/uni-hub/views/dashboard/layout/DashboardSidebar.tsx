'use client';

import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  CalendarDays,
  FileEdit,
  ChevronLeft,
  LogOut,
  Link2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@una';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@uni-hub/components/common/LanguageSwitcher';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useFeatures } from '@uni-hub/features';
import type { FeatureFlags, FeatureFlagKey } from '@core/constants/features';
import { playClick } from '@uni-hub/utils/soundEffects';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { NAV_KEY, type NavKey } from '../constants';
import type { DashboardSidebarProps } from '../types';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export interface NavItemConfig {
  key: NavKey;
  icon: React.ReactNode;
  labelKey: TranslationKey;
  shortLabelKey: TranslationKey;
  featureFlag?: FeatureFlagKey;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    key: NAV_KEY.Overview,
    icon: <LayoutDashboard size={18} />,
    labelKey: 'nav.overview.full',
    shortLabelKey: 'nav.overview',
  },
  {
    key: NAV_KEY.Courses,
    icon: <BookOpen size={18} />,
    labelKey: 'nav.courses.full',
    shortLabelKey: 'nav.courses',
    featureFlag: 'isMoodleIntegrationEnabled',
  },
  {
    key: NAV_KEY.Grades,
    icon: <ClipboardList size={18} />,
    labelKey: 'nav.grades.full',
    shortLabelKey: 'nav.grades',
    featureFlag: 'isMoodleIntegrationEnabled',
  },
  {
    key: NAV_KEY.Schedule,
    icon: <CalendarDays size={18} />,
    labelKey: 'nav.schedule.full',
    shortLabelKey: 'nav.schedule',
    featureFlag: 'isEDeanEnabled',
  },
  {
    key: NAV_KEY.Assignments,
    icon: <FileEdit size={18} />,
    labelKey: 'nav.assignments.full',
    shortLabelKey: 'nav.assignments',
    featureFlag: 'isMoodleIntegrationEnabled',
  },
  {
    key: NAV_KEY.Opportunities,
    icon: <Sparkles size={18} />,
    labelKey: 'nav.opportunities.full',
    shortLabelKey: 'nav.opportunities',
    featureFlag: 'isOpportunitiesPlatformEnabled',
  },
];

export const getVisibleNavItems = (
  flags: FeatureFlags,
  isMoodleLinked: boolean,
): NavItemConfig[] => {
  const baseItems = NAV_ITEMS.filter((item) => !item.featureFlag || flags[item.featureFlag]);

  if (!isMoodleLinked && flags.isMoodleIntegrationEnabled) {
    return [
      ...baseItems,
      {
        key: NAV_KEY.ConnectMoodle,
        icon: <Link2 size={18} />,
        labelKey: 'nav.connectMoodle.full',
        shortLabelKey: 'nav.connectMoodle',
      },
    ];
  }

  return baseItems;
};

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  collapsed,
  onToggleCollapsed,
  mobileMenuOpen,
  onCloseMobileMenu,
  activeKey,
  onSelectKey,
  soundEnabled,
  onLogout,
  isMoodleLinked = true,
}) => {
  const { formatMessage } = useLanguage();
  const flags = useFeatures();
  const visibleNavItems = getVisibleNavItems(flags, isMoodleLinked);
  const siderRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const getFocusableElements = (): HTMLElement[] => {
      if (!siderRef.current) {
        return [];
      }

      const elements = siderRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      return Array.from(elements).filter((element) => {
        if (typeof element.checkVisibility === 'function') {
          return element.checkVisibility();
        }

        return element.offsetParent !== null;
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseMobileMenu();

        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();

        if (focusableElements.length === 0) {
          event.preventDefault();

          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements.at(-1);

        const isOutsideOrFirst =
          document.activeElement === firstElement ||
          !siderRef.current?.contains(document.activeElement);

        const isOutsideOrLast =
          document.activeElement === lastElement ||
          !siderRef.current?.contains(document.activeElement);

        if (event.shiftKey && isOutsideOrFirst) {
          event.preventDefault();

          lastElement?.focus();
        } else if (!event.shiftKey && isOutsideOrLast) {
          event.preventDefault();

          firstElement?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const visibleFocusables = getFocusableElements();
    const firstFocusable = visibleFocusables[0];

    firstFocusable?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen, onCloseMobileMenu]);

  return (
    <>
      {mobileMenuOpen && (
        <button
          type="button"
          className={styles.mobileOverlay}
          onClick={onCloseMobileMenu}
          aria-label="Закрити меню"
        />
      )}
      <aside ref={siderRef} id="dashboard-sidebar" className={styles.sider} aria-label="Навігація">
        <button
          type="button"
          className={styles.edgeToggle}
          onClick={onToggleCollapsed}
          aria-label={formatMessage(collapsed ? 'sidebar.expand' : 'sidebar.collapse')}
          aria-expanded={!collapsed}
          aria-controls="dashboard-sidebar"
        >
          <ChevronLeft size={14} aria-hidden />
        </button>

        <div className={styles.brand}>
          <span>{collapsed && !mobileMenuOpen ? 'U' : 'UNiVerse'}</span>
        </div>

        <nav className={styles.nav}>
          {visibleNavItems.map((item) => {
            const label = formatMessage(item.labelKey);
            const shortLabel = formatMessage(item.shortLabelKey);
            const isConnect = item.key === 'connectMoodle';

            return (
              <button
                key={item.key}
                type="button"
                className={clsx(
                  styles.navItem,
                  activeKey === item.key && styles.active,
                  isConnect && styles.connectMoodleNavItem,
                )}
                onClick={() => {
                  playClick(soundEnabled);
                  onSelectKey(item.key);
                  onCloseMobileMenu();
                }}
                title={label}
                aria-label={label}
              >
                {activeKey === item.key && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className={styles.activePill}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {item.icon}
                {(!collapsed || mobileMenuOpen) && (
                  <>
                    <span className={styles.desktopLabel}>{label}</span>
                    <span className={styles.mobileLabel}>{shortLabel}</span>
                    {isConnect && <span className={styles.navBadgePulse} aria-hidden />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className={styles.siderFooter}>
          {flags.isMoodleIntegrationEnabled && (
            <a
              href="https://moodle.universemvp.tech"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.moodleStatusLink}
              title={formatMessage('sidebar.moodleConnected')}
            >
              <span className={styles.statusDot} aria-hidden />
              {!collapsed || mobileMenuOpen ? (
                <span className={styles.moodleHost}>🔗 moodle.universemvp.tech</span>
              ) : (
                <span className={styles.moodleCompactIcon}>🔗</span>
              )}
            </a>
          )}
          <LanguageSwitcher
            compact
            showLabel={!collapsed || mobileMenuOpen}
            variant="sider"
            placement="top-start"
          />
          <ThemeSwitcher
            compact
            placement="top-start"
            showLabel={!collapsed || mobileMenuOpen}
            className={styles.themeBtn}
          />
          <Button
            type="button"
            variant="secondary"
            isTransparent
            onClick={onLogout}
            className={styles.logoutBtn}
          >
            <LogOut size={18} />
            {(!collapsed || mobileMenuOpen) && <span>{formatMessage('sidebar.logout')}</span>}
          </Button>
        </div>
      </aside>
    </>
  );
};
