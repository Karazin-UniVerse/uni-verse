'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { RotateCw, AlertCircle, Link2 } from 'lucide-react';
import { Button, Spinner } from '@una';
import { isLoggedIn } from '@core/auth';
import type { CourseModule } from '@uni-hub/types';
import { AssignmentModal } from '@uni-hub/components/assignments';
import { LinkMoodleModal, UnlinkMoodleModal, LinkMoodleMode } from '@uni-hub/components/auth';
import { DashboardSkeleton, MobileBottomNav } from '@uni-hub/components/dashboard';
import { BadgeSystem, GradeSimulator } from '@uni-hub/components/gamification';
import { ScheduleView } from '@uni-hub/components/schedule';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import {
  NAV_KEY,
  type NavKey,
  isNavKey,
  fallbackStudentProfile,
  DashboardSidebar,
  DashboardHeader,
  OverviewTab,
  CoursesTab,
  GradesTab,
  AssignmentsTab,
  ConnectMoodleTab,
  OpportunitiesTab,
  NAV_ITEMS,
} from './dashboard';
import { useFeatures } from '@uni-hub/features';
import { formatLastSync } from './dashboard/tabs/helpers';
import { useDashboardData, clearUserSessionStorage } from './dashboard/hooks/useDashboardData';
import { useMoodleLink } from './dashboard/hooks/useMoodleLink';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import styles from './DashboardPage.module.scss';

const PAGE_TITLE_KEYS: Record<NavKey, TranslationKey> = {
  [NAV_KEY.Overview]: 'nav.overview.full',
  [NAV_KEY.Courses]: 'nav.courses.full',
  [NAV_KEY.Grades]: 'nav.grades.full',
  [NAV_KEY.Schedule]: 'nav.schedule.full',
  [NAV_KEY.Assignments]: 'nav.assignments.full',
  [NAV_KEY.Opportunities]: 'nav.opportunities.full',
  [NAV_KEY.ConnectMoodle]: 'nav.connectMoodle.full',
};

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkIn = useGamificationStore((s) => s.checkIn);
  const soundEnabled = useGamificationStore((s) => s.soundEnabled);
  const setSoundEnabled = useGamificationStore((s) => s.setSoundEnabled);
  const { formatMessage } = useLanguage();
  const flags = useFeatures();
  const flagsRef = useRef(flags);

  useEffect(() => {
    flagsRef.current = flags;
  });

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<NavKey>(NAV_KEY.Overview);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [selectedDueUnixSec, setSelectedDueUnixSec] = useState<number | undefined>();
  const [mounted, setMounted] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hideCompleted, setHideCompleted] = useState(false);

  const [isAssignmentModalVisible, setIsAssignmentModalVisible] = useState(false);
  const [selectedAssignmentModule, setSelectedAssignmentModule] = useState<CourseModule | null>(
    null,
  );

  const {
    data,
    setData,
    loading,
    hasLoadedOnce,
    lastSyncTime,
    isOfflineData,
    studentProfile,
    setStudentProfile,
    fetchData,
    cancelPendingFetch,
  } = useDashboardData({
    sortOrder,
    dateFrom,
    dateTo,
    hideCompleted,
    enabled: flags.isMoodleIntegrationEnabled,
    onUnauthorized: () => router.push('/login'),
  });

  const {
    isMoodleLinked,
    linkModalMode,
    isLinkModalOpen,
    isUnlinkModalOpen,
    openLinkModal,
    closeLinkModal,
    openUnlinkModal,
    closeUnlinkModal,
    handleLinkSuccess,
    handleUnlinkSuccess,
  } = useMoodleLink({
    activeKey,
    setActiveKey,
    onLinkSuccess: () => {
      void fetchData();
    },
    onUnlinkSuccess: () => {
      cancelPendingFetch();
      setData({
        courses: [],
        grades: [],
        assignments: [],
        events: [],
        notifications: [],
        unreadCount: 0,
        statistics: null,
      });
    },
  });

  const activeStudentProfile = studentProfile ?? fallbackStudentProfile;

  const hasCachedData =
    data.courses.length > 0 ||
    data.grades.length > 0 ||
    data.assignments.length > 0 ||
    data.events.length > 0 ||
    hasLoadedOnce;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');

      return;
    }

    const savedUser = localStorage.getItem('username');

    if (savedUser && savedUser !== fallbackStudentProfile.fullName) {
      setStudentProfile(
        (previousProfile) =>
          previousProfile ?? {
            ...fallbackStudentProfile,
            fullName: savedUser,
            email: savedUser.includes('@') ? savedUser : `${savedUser}@karazin.ua`,
          },
      );
    }

    checkIn();
  }, [checkIn, router, setStudentProfile]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (requestedTab && isNavKey(requestedTab)) {
      if (requestedTab === NAV_KEY.ConnectMoodle && isMoodleLinked) {
        setActiveKey(NAV_KEY.Overview);

        return;
      }

      const targetItem = NAV_ITEMS.find((item) => item.key === requestedTab);

      if (!targetItem?.featureFlag || flagsRef.current[targetItem.featureFlag]) {
        setActiveKey(requestedTab);

        return;
      }
    }

    setActiveKey(NAV_KEY.Overview);
  }, [searchParams, isMoodleLinked]);

  useEffect(() => {
    const activeItem = NAV_ITEMS.find((item) => item.key === activeKey);

    if (activeItem?.featureFlag && !flags[activeItem.featureFlag]) {
      setActiveKey(NAV_KEY.Overview);
    }
  }, [flags, activeKey]);

  useEffect(() => {
    if (!isLoggedIn()) {
      return;
    }

    void fetchData();

    return () => {
      cancelPendingFetch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, sortOrder, dateFrom, dateTo, hideCompleted, flags.isMoodleIntegrationEnabled]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);

    const menuButton = document.querySelector<HTMLButtonElement>(`.${styles.mobileMenuBtn}`);

    menuButton?.focus();
  }, []);

  const handleLogout = () => {
    clearUserSessionStorage();
    router.push('/login');
  };

  const renderActiveContent = () => {
    const activeItem = NAV_ITEMS.find((item) => item.key === activeKey);
    let effectiveKey: NavKey =
      activeItem?.featureFlag && !flags[activeItem.featureFlag] ? NAV_KEY.Overview : activeKey;

    if (effectiveKey === NAV_KEY.ConnectMoodle && isMoodleLinked) {
      effectiveKey = NAV_KEY.Overview;
    }

    switch (effectiveKey) {
      case NAV_KEY.Overview:
        return (
          <OverviewTab
            courses={data.courses}
            events={data.events}
            assignments={data.assignments}
            grades={data.grades}
            statistics={data.statistics}
            activeStudentProfile={activeStudentProfile}
            loading={loading}
            onNavigate={setActiveKey}
            isMoodleLinked={isMoodleLinked}
          />
        );
      case NAV_KEY.Courses:
        return <CoursesTab courses={data.courses} soundEnabled={soundEnabled} />;
      case NAV_KEY.Grades:
        return <GradesTab grades={data.grades} onOpenSimulator={() => setSimulatorOpen(true)} />;
      case NAV_KEY.Schedule:
        return <ScheduleView />;
      case NAV_KEY.Assignments:
        return (
          <AssignmentsTab
            assignments={data.assignments}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            hideCompleted={hideCompleted}
            onHideCompletedChange={setHideCompleted}
            soundEnabled={soundEnabled}
            onOpenAssignment={(item) => {
              setSelectedAssignmentModule({
                id: item.id,
                instance: item.id,
                name: item.name,
                modname: 'assign',
                description: item.description,
                contents: [],
              });
              setSelectedDueUnixSec(item.duedate);
              setIsAssignmentModalVisible(true);
            }}
          />
        );
      case NAV_KEY.Opportunities:
        return <OpportunitiesTab />;
      case NAV_KEY.ConnectMoodle:
        return <ConnectMoodleTab onConnect={() => openLinkModal(LinkMoodleMode.CONNECT)} />;
      default:
        return null;
    }
  };

  // Spinner only after mount — keeps SSR and first client render identical
  const showUpdatingIndicator = mounted && loading && hasCachedData;

  return (
    <div
      className={`${styles.layout} ${collapsed ? styles.collapsed : ''} ${mobileMenuOpen ? styles.mobileOpen : ''}`}
    >
      <BadgeSystem grades={data.grades} />
      <DashboardSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((previous) => !previous)}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={closeMobileMenu}
        activeKey={activeKey}
        onSelectKey={setActiveKey}
        soundEnabled={soundEnabled}
        onLogout={handleLogout}
        isMoodleLinked={isMoodleLinked}
      />
      <MobileBottomNav
        activeKey={activeKey}
        onSelectKey={setActiveKey}
        soundEnabled={soundEnabled}
      />

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
          notifications={data.notifications}
          unreadCount={data.unreadCount}
          activeStudentProfile={activeStudentProfile}
          isMoodleLinked={isMoodleLinked}
          onOpenLinkMoodle={openLinkModal}
          onOpenUnlinkMoodle={openUnlinkModal}
        />

        <main className={styles.content}>
          <div className={styles.pageTitleRow}>
            <h2 className={styles.pageTitle}>{formatMessage(PAGE_TITLE_KEYS[activeKey])}</h2>

            {showUpdatingIndicator && (
              <div className={styles.pageUpdatingIndicator} role="status" aria-live="polite">
                <Spinner size="small" tip={formatMessage('dashboard.updating')} />
              </div>
            )}

            <div className={styles.syncActions}>
              {mounted && lastSyncTime && (
                <span className={styles.lastSyncText}>
                  {formatMessage('dashboard.dataUpdated')}: {formatLastSync(lastSyncTime)}
                </span>
              )}
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => fetchData(true)}
                disabled={loading}
                aria-label={formatMessage('dashboard.refreshData')}
                className={styles.refreshBtn}
              >
                <RotateCw size={14} className={clsx(styles.refreshIcon, loading && styles.spin)} />
                <span>{formatMessage('dashboard.refresh')}</span>
              </Button>
            </div>
          </div>

          {mounted && isOfflineData && (
            <div className={styles.offlineBanner} role="alert">
              <AlertCircle size={16} className={styles.offlineIcon} />
              <span>
                {formatMessage('dashboard.offlineWarning')}
                {lastSyncTime
                  ? ` ${formatMessage('dashboard.offlineFrom')} ${formatLastSync(lastSyncTime)}`
                  : ''}
                .
              </span>
            </div>
          )}

          {!isMoodleLinked && (
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
          {loading && !hasCachedData ? (
            <DashboardSkeleton />
          ) : (
            <motion.div
              key={activeKey}
              initial={mounted ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderActiveContent()}
            </motion.div>
          )}

          <AssignmentModal
            visible={isAssignmentModalVisible}
            onClose={() => {
              setIsAssignmentModalVisible(false);
              setSelectedAssignmentModule(null);
              setSelectedDueUnixSec(undefined);
            }}
            module={selectedAssignmentModule}
            dueUnixSec={selectedDueUnixSec}
          />

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

          <GradeSimulator
            open={simulatorOpen}
            onClose={() => setSimulatorOpen(false)}
            grades={data.grades}
            assignments={data.assignments}
          />
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
