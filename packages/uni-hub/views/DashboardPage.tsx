'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { RotateCw, AlertCircle } from 'lucide-react';
import { Button as UnaButton, Spinner } from '@una';
import { isLoggedIn } from '@core/auth';
import type { CourseModule } from '@uni-hub/types';
import { AssignmentModal } from '@uni-hub/components/assignments';
import { DashboardSkeleton, MobileBottomNav } from '@uni-hub/components/dashboard';
import { BadgeSystem, GradeSimulator } from '@uni-hub/components/gamification';
import { ScheduleView } from '@uni-hub/components/schedule';
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
} from './dashboard';
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
};

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkIn = useGamificationStore((s) => s.checkIn);
  const soundEnabled = useGamificationStore((s) => s.soundEnabled);
  const setSoundEnabled = useGamificationStore((s) => s.setSoundEnabled);
  const { formatMessage } = useLanguage();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<NavKey>('overview');
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [selectedDueUnixSec, setSelectedDueUnixSec] = useState<number | undefined>();

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
    try {
      if (searchParams.get('demo') === 'true' && !isLoggedIn()) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('accessToken', 'demo-token');
        localStorage.setItem('moodleToken', 'demo-token');
        localStorage.setItem('isDemo', 'true');
      }
    } catch {
      // Ignore storage errors
    }

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
  }, [checkIn, router, searchParams, setStudentProfile]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (requestedTab) {
      setActiveKey(isNavKey(requestedTab) ? requestedTab : 'overview');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoggedIn()) {
      return;
    }

    void fetchData();

    return () => {
      cancelPendingFetch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, sortOrder, dateFrom, dateTo, hideCompleted]);

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
    switch (activeKey) {
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
      default:
        return null;
    }
  };

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
            {loading && hasCachedData && (
              <div className={styles.pageUpdatingIndicator} role="status" aria-live="polite">
                <Spinner size="small" tip={formatMessage('dashboard.updating')} />
              </div>
            )}
            <div className={styles.syncActions}>
              {lastSyncTime && (
                <span className={styles.lastSyncText}>
                  {formatMessage('dashboard.dataUpdated')}: {formatLastSync(lastSyncTime)}
                </span>
              )}
              <UnaButton
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
              </UnaButton>
            </div>
          </div>

          {isOfflineData && (
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
          {loading && !hasCachedData ? (
            <DashboardSkeleton />
          ) : (
            <motion.div
              key={activeKey}
              initial={{ opacity: 0, y: 6 }}
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
