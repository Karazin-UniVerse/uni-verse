'use client';

import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { RotateCw, AlertCircle, Link2 } from 'lucide-react';
import { Button, Spinner } from '@una';
import { isLoggedIn } from '@core/utils/auth';
import { LinkMoodleModal, UnlinkMoodleModal, LinkMoodleMode } from '@uni-hub/components/auth';
import { DashboardSkeleton, MobileBottomNav } from '@uni-hub/components/dashboard';
import { BadgeSystem } from '@uni-hub/components/gamification';
import { useFeatures } from '@uni-hub/features';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { useLogout } from '@uni-hub/hooks/useAuthMutations';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { useMoodleStore } from '@uni-hub/store/useMoodleStore';
import { useOpportunitiesStore } from '@uni-hub/store/useOpportunitiesStore';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { NAV_KEY, type NavKey } from '../constants';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardErrorHandling } from '../hooks/useDashboardErrorHandling';
import { NAV_KEY_ROUTE, getNavKeyFromPathname } from '../routes';
import { resolveNavKey } from '../utils';
import { formatLastSync } from '../tabs/helpers';
import { invalidateOpportunities } from '../tabs/opportunities/cache';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar, NAV_ITEMS } from './DashboardSidebar';
import styles from '@uni-hub/views/dashboard/layout/DashboardShell.module.scss';

const PAGE_TITLE_KEYS: Record<NavKey, TranslationKey> = {
  [NAV_KEY.Overview]: 'nav.overview',
  [NAV_KEY.Study]: 'nav.study',
  [NAV_KEY.Schedule]: 'nav.schedule',
  [NAV_KEY.Opportunities]: 'nav.opportunities',
  [NAV_KEY.ConnectMoodle]: 'nav.connectMoodle',
};

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const features = useFeatures();
  const logout = useLogout();
  const checkIn = useGamificationStore((state) => state.checkIn);
  const soundEnabled = useGamificationStore((state) => state.soundEnabled);
  const setSoundEnabled = useGamificationStore((state) => state.setSoundEnabled);
  const { formatMessage } = useLanguage();

  const dashboard = useDashboardData();
  const isMoodleLinked = useMoodleStore((state) => state.isMoodleLinked);
  const linkModalMode = useMoodleStore((state) => state.linkModalMode);
  const isLinkModalOpen = useMoodleStore((state) => state.isLinkModalOpen);
  const isUnlinkModalOpen = useMoodleStore((state) => state.isUnlinkModalOpen);
  const openLinkModal = useMoodleStore((state) => state.openLinkModal);
  const closeLinkModal = useMoodleStore((state) => state.closeLinkModal);
  const openUnlinkModal = useMoodleStore((state) => state.openUnlinkModal);
  const closeUnlinkModal = useMoodleStore((state) => state.closeUnlinkModal);
  const completeLink = useMoodleStore((state) => state.completeLink);
  const completeUnlink = useMoodleStore((state) => state.completeUnlink);

  useDashboardErrorHandling({
    error: dashboard.error,
    errorUpdatedAt: dashboard.errorUpdatedAt,
    isOfflineData: dashboard.isOfflineData,
    platformError: dashboard.platformError,
  });

  useEffect(() => {
    useMoodleStore.getState().syncLinkedFromStorage();

    return () => {
      useMoodleStore.getState().resetSession();
      useOpportunitiesStore.getState().reset();
    };
  }, []);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pathNavKey = getNavKeyFromPathname(pathname);
  const activeKey = resolveNavKey(pathNavKey, {
    navItems: NAV_ITEMS,
    features,
    isMoodleLinked,
  });

  useEffect(() => {
    if (activeKey !== pathNavKey) {
      router.replace(NAV_KEY_ROUTE[activeKey]);
    }
  }, [activeKey, pathNavKey, router]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');

      return;
    }

    checkIn();
  }, [checkIn, router]);

  const closeMobileMenu = useCallback((): void => {
    setMobileMenuOpen(false);

    const menuButton = document.querySelector<HTMLButtonElement>(`.${styles.mobileMenuBtn}`);

    menuButton?.focus();
  }, []);

  const handleLogout = (): void => {
    logout.mutate(undefined, {
      onSettled: () => {
        router.push('/login');
      },
    });
  };

  const selectKey = (key: NavKey): void => router.push(NAV_KEY_ROUTE[key]);

  const handleRefresh = (): void => {
    void invalidateOpportunities(queryClient);
    void dashboard.refresh();
  };

  const handleLinkSuccess = (): void => {
    completeLink();
    void queryClient.invalidateQueries({ queryKey: moodleKeys.all });
  };

  const handleUnlinkSuccess = (): void => {
    completeUnlink();
    queryClient.removeQueries({ queryKey: moodleKeys.all });
  };

  const content = activeKey === pathNavKey ? children : null;

  return (
    <div
      className={`${styles.layout} ${collapsed ? styles.collapsed : ''} ${mobileMenuOpen ? styles.mobileOpen : ''}`}
    >
      <BadgeSystem grades={dashboard.data.grades} />
      <DashboardSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((previous) => !previous)}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={closeMobileMenu}
        activeKey={activeKey}
        onSelectKey={selectKey}
        soundEnabled={soundEnabled}
        onLogout={handleLogout}
        isMoodleLinked={isMoodleLinked}
      />
      <MobileBottomNav activeKey={activeKey} onSelectKey={selectKey} soundEnabled={soundEnabled} />

      <div
        className={styles.main}
        inert={mobileMenuOpen ? true : undefined}
        aria-hidden={mobileMenuOpen}
      >
        <DashboardHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          mobileMenuOpen={mobileMenuOpen}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          notifications={dashboard.data.notifications}
          unreadCount={dashboard.data.unreadCount}
          activeStudentProfile={dashboard.studentProfile}
          isMoodleLinked={isMoodleLinked}
          onOpenLinkMoodle={openLinkModal}
          onOpenUnlinkMoodle={openUnlinkModal}
        />

        <main className={styles.content}>
          <div className={styles.pageTitleRow}>
            <h2 className={styles.pageTitle}>{formatMessage(PAGE_TITLE_KEYS[activeKey])}</h2>
            {dashboard.loading && dashboard.hasCachedData && (
              <div className={styles.pageUpdatingIndicator} role="status" aria-live="polite">
                <Spinner size="small" tip={formatMessage('dashboard.updating')} />
              </div>
            )}
            <div className={styles.syncActions}>
              {dashboard.lastSyncTime && (
                <span className={styles.lastSyncText}>
                  {formatMessage('dashboard.dataUpdated')}: {formatLastSync(dashboard.lastSyncTime)}
                </span>
              )}
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={handleRefresh}
                disabled={dashboard.loading}
                aria-label={formatMessage('dashboard.refreshData')}
                className={styles.refreshBtn}
              >
                <RotateCw
                  size={14}
                  className={clsx(styles.refreshIcon, dashboard.loading && styles.spin)}
                />
                <span>{formatMessage('dashboard.refresh')}</span>
              </Button>
            </div>
          </div>

          {dashboard.isOfflineData && (
            <div className={styles.offlineBanner} role="alert">
              <AlertCircle size={16} className={styles.offlineIcon} />
              <span>
                {formatMessage('dashboard.offlineWarning')}
                {dashboard.lastSyncTime
                  ? ` ${formatMessage('dashboard.offlineFrom')} ${formatLastSync(dashboard.lastSyncTime)}`
                  : ''}
                .
              </span>
            </div>
          )}
          {features.isMoodleIntegrationEnabled && !isMoodleLinked && (
            <output className={styles.linkMoodleBanner}>
              <div className={styles.linkMoodleBannerContent}>
                <Link2 size={16} className={styles.linkMoodleIcon} />
                <span>{formatMessage('dashboard.linkMoodlePrompt')}</span>
              </div>
              <Button
                type="button"
                variant="primary"
                size="small"
                onClick={() => openLinkModal(LinkMoodleMode.CONNECT)}
              >
                {formatMessage('dashboard.linkMoodleAction')}
              </Button>
            </output>
          )}
          {dashboard.loading && !dashboard.hasCachedData ? (
            <DashboardSkeleton />
          ) : (
            <motion.div
              key={activeKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {content}
            </motion.div>
          )}

          {features.isMoodleIntegrationEnabled && (
            <>
              <LinkMoodleModal
                mode={linkModalMode}
                open={isLinkModalOpen}
                onClose={closeLinkModal}
                onSuccess={handleLinkSuccess}
              />

              <UnlinkMoodleModal
                open={isUnlinkModalOpen}
                onClose={closeUnlinkModal}
                onSuccess={handleUnlinkSuccess}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};
