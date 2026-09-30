'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  CalendarDays,
  FileEdit,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { Button } from '@una';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@uni-hub/components/common/LanguageSwitcher';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { playClick } from '@uni-hub/utils/soundEffects';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import type { DashboardSidebarProps, NavKey } from '../types';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export interface NavItemConfig {
  key: NavKey;
  icon: React.ReactNode;
  labelKey: TranslationKey;
  shortLabelKey: TranslationKey;
  label: string;
  shortLabel: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    key: 'overview',
    icon: <LayoutDashboard size={18} />,
    labelKey: 'nav.overview.full',
    shortLabelKey: 'nav.overview',
    label: 'Картка студента / Огляд',
    shortLabel: 'Огляд',
  },
  {
    key: 'courses',
    icon: <BookOpen size={18} />,
    labelKey: 'nav.courses.full',
    shortLabelKey: 'nav.courses',
    label: 'Індивідуальний план',
    shortLabel: 'Курси',
  },
  {
    key: 'grades',
    icon: <ClipboardList size={18} />,
    labelKey: 'nav.grades.full',
    shortLabelKey: 'nav.grades',
    label: 'Заліковка та бали',
    shortLabel: 'Оцінки',
  },
  {
    key: 'schedule',
    icon: <CalendarDays size={18} />,
    labelKey: 'nav.schedule.full',
    shortLabelKey: 'nav.schedule',
    label: 'Розклад занять',
    shortLabel: 'Розклад',
  },
  {
    key: 'assignments',
    icon: <FileEdit size={18} />,
    labelKey: 'nav.assignments.full',
    shortLabelKey: 'nav.assignments',
    label: 'Завдання',
    shortLabel: 'Завдання',
  },
];

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  collapsed,
  onToggleCollapsed,
  mobileMenuOpen,
  onCloseMobileMenu,
  activeKey,
  onSelectKey,
  soundEnabled,
  onLogout,
}) => {
  const { formatMessage } = useLanguage();
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
        <div className={styles.brand}>
          <span>{collapsed && !mobileMenuOpen ? 'U' : 'UNiVerse'}</span>
          <Button
            type="button"
            variant="secondary"
            size="small"
            isTransparent
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Розгорнути меню' : 'Згорнути меню'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const label = formatMessage(item.labelKey);
            const shortLabel = formatMessage(item.shortLabelKey);

            return (
              <button
                key={item.key}
                type="button"
                className={`${styles.navItem} ${activeKey === item.key ? styles.active : ''}`}
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
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className={styles.siderFooter}>
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
          <LanguageSwitcher
            compact
            showLabel={!collapsed || mobileMenuOpen}
            variant="sider"
            placement="bottom-up-left"
          />
          <ThemeSwitcher
            compact
            showLabel={!collapsed || mobileMenuOpen}
            className={styles.themeBtn}
          />
          <Button
            type="button"
            variant="secondary"
            size="medium"
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
