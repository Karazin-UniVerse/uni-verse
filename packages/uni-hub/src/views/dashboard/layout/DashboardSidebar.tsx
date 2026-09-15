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
import { Button as SimpleButton } from '@una';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { playClick } from '@uni-hub/utils/soundEffects';
import type { DashboardSidebarProps, NavKey } from '../types';
import styles from '@uni-hub/views/DashboardPage.module.scss';

const menuItems: { key: NavKey; icon: React.ReactNode; label: string }[] = [
  { key: 'overview', icon: <LayoutDashboard size={18} />, label: 'Картка студента / Огляд' },
  { key: 'courses', icon: <BookOpen size={18} />, label: 'Індивідуальний план' },
  { key: 'grades', icon: <ClipboardList size={18} />, label: 'Заліковка та бали' },
  { key: 'schedule', icon: <CalendarDays size={18} />, label: 'Розклад занять' },
  { key: 'assignments', icon: <FileEdit size={18} />, label: 'Завдання' },
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
          <SimpleButton
            type="button"
            variant="secondary"
            size="small"
            isTransparent
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Розгорнути меню' : 'Згорнути меню'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </SimpleButton>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${styles.navItem} ${activeKey === item.key ? styles.active : ''}`}
              onClick={() => {
                playClick(soundEnabled);
                onSelectKey(item.key);
                onCloseMobileMenu();
              }}
              title={item.label}
            >
              {activeKey === item.key && (
                <motion.div
                  layoutId="active-nav-pill"
                  className={styles.activePill}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {item.icon}
              {(!collapsed || mobileMenuOpen) && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className={styles.siderFooter}>
          <a
            href="https://moodle.universemvp.tech"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.moodleStatusLink}
            title="Moodle LMS: moodle.universemvp.tech (активно)"
          >
            <span className={styles.statusDot} aria-hidden />
            {!collapsed || mobileMenuOpen ? (
              <span className={styles.moodleHost}>🔗 moodle.universemvp.tech</span>
            ) : (
              <span className={styles.moodleCompactIcon}>🔗</span>
            )}
          </a>
          <ThemeSwitcher
            compact
            showLabel={!collapsed || mobileMenuOpen}
            className={styles.themeBtn}
          />
          <SimpleButton
            type="button"
            variant="secondary"
            size="medium"
            isTransparent
            onClick={onLogout}
            className={styles.logoutBtn}
          >
            <LogOut size={18} />
            {(!collapsed || mobileMenuOpen) && <span>Вийти</span>}
          </SimpleButton>
        </div>
      </aside>
    </>
  );
};
