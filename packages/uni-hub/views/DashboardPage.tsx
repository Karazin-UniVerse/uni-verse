'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { RotateCw, AlertCircle, Link2 } from 'lucide-react';
import { Button, Spinner } from '@una';
import { isLoggedIn } from '@core/utils/auth';
import type { CourseModule } from '@uni-hub/types';
import { AssignmentModal } from '@uni-hub/components/assignments';
import { LinkMoodleModal } from '@uni-hub/components/auth';
import { DashboardSkeleton, MobileBottomNav } from '@uni-hub/components/dashboard';
import { BadgeSystem, GradeSimulator } from '@uni-hub/components/gamification';
import { ScheduleView } from '@uni-hub/components/schedule';
import { safeStorage } from '@uni-hub/services/api';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import {
  type NavKey,
  isNavKey,
  fallbackStudentProfile,
  DashboardSidebar,
  DashboardHeader,
  OverviewTab,
  CoursesTab,
  GradesTab,
  AssignmentsTab,
  OpportunitiesTab,
  NAV_ITEMS,
} from './dashboard';
import { useFeatures } from '@uni-hub/features';
import { formatLastSync } from './dashboard/tabs/helpers';
import { useDashboardData, clearUserSessionStorage } from './dashboard/hooks/useDashboardData';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import styles from './DashboardPage.module.scss';

const PAGE_TITLE_KEYS: Record<NavKey, TranslationKey> = {
  overview: 'nav.overview.full',
  courses: 'nav.courses.full',
  grades: 'nav.grades.full',
  schedule: 'nav.schedule.full',
  assignments: 'nav.assignments.full',
  opportunities: 'nav.opportunities.full',
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
  const [activeKey, setActiveKey] = useState<NavKey>('overview');
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
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isMoodleLinked, setIsMoodleLinked] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return safeStorage.getItem('isMoodleLinked') !== 'false';
  });

  const {
    data,
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
      const targetItem = NAV_ITEMS.find((item) => item.key === requestedTab);

      if (!targetItem?.featureFlag || flagsRef.current[targetItem.featureFlag]) {
        setActiveKey(requestedTab);

        return;
      }
    }

    setActiveKey('overview');
  }, [searchParams]);

  useEffect(() => {
    const activeItem = NAV_ITEMS.find((item) => item.key === activeKey);

    if (activeItem?.featureFlag && !flags[activeItem.featureFlag]) {
      setActiveKey('overview');
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
    const effectiveKey =
      activeItem?.featureFlag && !flags[activeItem.featureFlag] ? 'overview' : activeKey;

    switch (effectiveKey) {
      case 'overview':
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
          />
        );
      case 'courses':
        return <CoursesTab courses={data.courses} soundEnabled={soundEnabled} />;
      case 'grades':
        return <GradesTab grades={data.grades} onOpenSimulator={() => setSimulatorOpen(true)} />;
      case 'schedule':
        return <ScheduleView />;
      case 'assignments':
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
      case 'opportunities':
        return <OpportunitiesTab />;
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
                onClick={() => setIsLinkModalOpen(true)}
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
            open={isLinkModalOpen}
            onClose={() => setIsLinkModalOpen(false)}
            onSuccess={() => {
              setIsLinkModalOpen(false);
              setIsMoodleLinked(true);
              safeStorage.setItem('isMoodleLinked', 'true');
              fetchData();
            }}
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
