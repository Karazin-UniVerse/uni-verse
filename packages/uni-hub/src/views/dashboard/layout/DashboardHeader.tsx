'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Menu, Volume2, VolumeX, Bell, User } from 'lucide-react';
import { Button as SimpleButton, Tag, Empty } from '@una';
import { StreakBadge } from '@uni-hub/components/gamification';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import type { DashboardHeaderProps } from '../types';
import { stripHtml } from '../utils';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onOpenMobileMenu,
  mobileMenuOpen,
  soundEnabled,
  onToggleSound,
  notifications,
  unreadCount,
  activeStudentProfile,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }

      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);

    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    window.location.href = '/login';
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <SimpleButton
          type="button"
          variant="secondary"
          size="medium"
          isTransparent
          className={styles.mobileMenuBtn}
          onClick={onOpenMobileMenu}
          aria-label="Відкрити меню"
          aria-expanded={mobileMenuOpen}
          aria-controls="dashboard-sidebar"
        >
          <Menu size={20} />
        </SimpleButton>
        <StreakBadge />
      </div>

      <div className={styles.headerRight}>
        <SimpleButton
          type="button"
          variant="secondary"
          size="medium"
          isTransparent
          onClick={onToggleSound}
          aria-label={soundEnabled ? 'Вимкнути звук' : 'Увімкнути звук'}
          className={styles.desktopOnly}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </SimpleButton>

        <div className={styles.notifWrap} ref={notifRef}>
          <SimpleButton
            type="button"
            variant="secondary"
            size="medium"
            isTransparent
            onClick={() => setNotifOpen((isOpen) => !isOpen)}
            aria-label="Сповіщення"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </SimpleButton>

          {notifOpen && (
            <motion.div
              className={styles.notifDropdown}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <div className={styles.notifHeader}>
                <strong>Сповіщення</strong>
                {unreadCount > 0 && <Tag tone="info">{unreadCount} нових</Tag>}
              </div>
              <div className={styles.notifList}>
                {notifications.length > 0 ? (
                  notifications.map((item) => {
                    const message = stripHtml(item.message);

                    return (
                      <div
                        key={item.id}
                        className={`${styles.notifItem} ${item.read ? '' : styles.unread}`}
                      >
                        <div className={styles.notifSubject}>{item.subject}</div>
                        <div className={styles.muted}>
                          {message.length > 100 ? `${message.substring(0, 100)}...` : message}
                        </div>
                        <div className={styles.notifTime}>
                          {new Date(item.timecreated * 1000).toLocaleString('uk-UA')}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <Empty description="Немає сповіщень" />
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div className={styles.userWrap} ref={userRef}>
          <div
            className={styles.user}
            title={`${activeStudentProfile.fullName} (${activeStudentProfile.group})`}
            onClick={() => setUserMenuOpen((open) => !open)}
            style={{ cursor: 'pointer' }}
          >
            <span className={styles.avatar}>
              <User size={16} />
            </span>
            <span>{activeStudentProfile.fullName}</span>
          </div>

          {userMenuOpen && (
            <motion.div
              className={styles.userDropdown}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <div className={styles.userDropdownHeader}>
                <strong>{activeStudentProfile.fullName}</strong>
                <div className={styles.muted}>{activeStudentProfile.group}</div>
              </div>

              <div className={styles.userDropdownBody}>
                <div className={styles.mobileOnlyItem}>
                  <ThemeSwitcher compact={false} showLabel={true} />
                </div>

                <div className={styles.mobileOnlyItem}>
                  <SimpleButton
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={onToggleSound}
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    {soundEnabled ? (
                      <Volume2 size={16} style={{ marginRight: 8 }} />
                    ) : (
                      <VolumeX size={16} style={{ marginRight: 8 }} />
                    )}
                    {soundEnabled ? 'Вимкнути звук' : 'Увімкнути звук'}
                  </SimpleButton>
                </div>

                <div className={styles.mobileOnlyItem} style={{ marginBottom: 8 }}>
                  <a
                    href="https://moodle.universemvp.tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.moodleStatusLink}
                  >
                    <span className={styles.statusDot} aria-hidden />
                    <span>Moodle LMS</span>
                  </a>
                </div>

                <div className={styles.mobileOnlyItem}>
                  <SimpleButton
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Вийти
                  </SimpleButton>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
};
