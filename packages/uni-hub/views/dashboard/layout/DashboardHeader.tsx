'use client';

import React from 'react';
import { Menu, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@una';
import { StreakBadge } from '@uni-hub/components/gamification';
import { DevFeaturePanel, useFeatures } from '@uni-hub/features';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useLogout } from '@uni-hub/hooks/useAuthMutations';
import type { DashboardHeaderProps } from '../types';
import { NotificationsDropdown } from './NotificationsDropdown';
import { UserDropdown } from './UserDropdown';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onOpenMobileMenu,
  mobileMenuOpen,
  soundEnabled,
  onToggleSound,
  notifications,
  unreadCount,
  activeStudentProfile,
  onOpenLinkMoodle,
  onOpenUnlinkMoodle,
  isMoodleLinked = true,
}) => {
  const { formatMessage } = useLanguage();
  const { isFeaturePanelEnabled, isMoodleIntegrationEnabled } = useFeatures();

  const logout = useLogout();

  const handleLogout = (): void => {
    logout.mutate(undefined, {
      onSettled: () => {
        window.location.href = '/login';
      },
    });
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <Button
          type="button"
          variant="secondary"
          isTransparent
          className={styles.mobileMenuBtn}
          onClick={onOpenMobileMenu}
          aria-label={formatMessage('header.openMenu')}
          aria-expanded={mobileMenuOpen}
          aria-controls="dashboard-sidebar"
        >
          <Menu size={20} />
        </Button>
        <StreakBadge />
      </div>

      <div className={styles.headerRight}>
        {isFeaturePanelEnabled && <DevFeaturePanel />}
        <Button
          type="button"
          variant="secondary"
          isTransparent
          onClick={onToggleSound}
          aria-label={
            soundEnabled ? formatMessage('header.soundMute') : formatMessage('header.soundUnmute')
          }
          className={styles.desktopOnly}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </Button>

        <NotificationsDropdown notifications={notifications} unreadCount={unreadCount} />

        <UserDropdown
          activeStudentProfile={activeStudentProfile}
          isMoodleIntegrationEnabled={isMoodleIntegrationEnabled}
          isMoodleLinked={isMoodleLinked}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
          onOpenLinkMoodle={onOpenLinkMoodle}
          onOpenUnlinkMoodle={onOpenUnlinkMoodle}
          onLogout={handleLogout}
        />
      </div>
    </header>
  );
};
