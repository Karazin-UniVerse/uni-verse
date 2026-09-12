'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Menu, Volume2, VolumeX, Bell, User } from 'lucide-react';
import { Button as SimpleButton, Tag, Empty } from '@una';
import { StreakBadge } from '@uni-hub/components/gamification';
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

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);

    return () => document.removeEventListener('mousedown', onClick);
  }, []);

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

        <div
          className={styles.user}
          title={`${activeStudentProfile.fullName} (${activeStudentProfile.group})`}
        >
          <span className={styles.avatar}>
            <User size={16} />
          </span>
          <span>{activeStudentProfile.fullName}</span>
        </div>
      </div>
    </header>
  );
};
