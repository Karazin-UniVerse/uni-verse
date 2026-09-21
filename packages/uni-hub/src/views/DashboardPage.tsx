'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spinner, useToast } from '@una';
import { moodleApi } from '@uni-hub/services/api';
import { isLoggedIn } from '@core/auth';
import type { StudentProfile } from '@core/types';
import type { Grade, CourseModule } from '@uni-hub/types';
import { AssignmentModal } from '@uni-hub/components/assignments';
import { DashboardSkeleton, MobileBottomNav } from '@uni-hub/components/dashboard';
import { BadgeSystem, GradeSimulator } from '@uni-hub/components/gamification';
import { ScheduleView } from '@uni-hub/components/schedule';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import {
  type NavKey,
  type DashboardData,
  isNavKey,
  fallbackStudentProfile,
  DashboardSidebar,
  DashboardHeader,
  OverviewTab,
  CoursesTab,
  GradesTab,
  AssignmentsTab,
} from './dashboard';
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

type GradesApiResponse = Awaited<ReturnType<typeof moodleApi.getGrades>>;

function parseDateFilterSeconds(dateString?: string): number | null {
  if (!dateString) {
    return null;
  }

  const dateParts = dateString.split('-');

  if (dateParts.length !== 3) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = dateParts;
  const expectedYear = Number.parseInt(yearStr, 10);
  const expectedMonth = Number.parseInt(monthStr, 10);
  const expectedDay = Number.parseInt(dayStr, 10);

  const parsedDate = new Date(dateString);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() > 2099 ||
    parsedDate.getUTCFullYear() > 2099
  ) {
    return null;
  }

  const matchesUtc =
    parsedDate.getUTCFullYear() === expectedYear &&
    parsedDate.getUTCMonth() + 1 === expectedMonth &&
    parsedDate.getUTCDate() === expectedDay;
  const matchesLocal =
    parsedDate.getFullYear() === expectedYear &&
    parsedDate.getMonth() + 1 === expectedMonth &&
    parsedDate.getDate() === expectedDay;

  if (!matchesUtc && !matchesLocal) {
    return null;
  }

  return Math.floor(parsedDate.getTime() / 1000);
}

function resolveGradesResponse(gradesResponse?: GradesApiResponse | null): Grade[] {
  if (Array.isArray(gradesResponse?.data?.grades)) {
    return gradesResponse.data.grades;
  }

  return [];
}
const DashboardPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const checkIn = useGamificationStore((s) => s.checkIn);
  const soundEnabled = useGamificationStore((s) => s.soundEnabled);
  const setSoundEnabled = useGamificationStore((s) => s.setSoundEnabled);
  const { t } = useLanguage();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<NavKey>('overview');
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [selectedDueUnixSec, setSelectedDueUnixSec] = useState<number | undefined>();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const activeStudentProfile = studentProfile ?? fallbackStudentProfile;

  const [data, setData] = useState<DashboardData>({
    courses: [],
    grades: [],
    assignments: [],
    events: [],
    notifications: [],
    unreadCount: 0,
    statistics: null,
  });

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hideCompleted, setHideCompleted] = useState(false);

  const [isAssignmentModalVisible, setIsAssignmentModalVisible] = useState(false);
  const [selectedAssignmentModule, setSelectedAssignmentModule] = useState<CourseModule | null>(
    null,
  );

  const hasCachedData =
    data.courses.length > 0 ||
    data.grades.length > 0 ||
    data.assignments.length > 0 ||
    data.events.length > 0 ||
    hasLoadedOnce;

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');

      return;
    }

    const savedUser = localStorage.getItem('username');

    if (savedUser && savedUser !== fallbackStudentProfile.fullName) {
      setStudentProfile({
        ...fallbackStudentProfile,
        fullName: savedUser,
        email: savedUser.includes('@') ? savedUser : `${savedUser}@karazin.ua`,
      });
    }

    checkIn();
  }, [checkIn, router]);

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

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);

      try {
        const params: Record<string, string | number> = { sortByDate: sortOrder };
        const fromTimestamp = parseDateFilterSeconds(dateFrom);
        const toTimestamp = parseDateFilterSeconds(dateTo);

        if (fromTimestamp !== null) {
          params.dateFrom = fromTimestamp;
        }

        if (toTimestamp !== null) {
          params.dateTo = toTimestamp;
        }

        if (hideCompleted) {
          params.status = 'not_completed';
        }

        const [coursesRes, gradesRes, assignmentsRes, eventsRes, notificationsRes, statsRes] =
          await Promise.all([
            moodleApi.getCourses(),
            moodleApi.getGrades(),
            moodleApi.getAssignments(params),
            moodleApi.getEvents(),
            moodleApi.getNotifications(),
            moodleApi.getStatistics(),
          ]);

        if (cancelled) return;

        setData({
          courses: Array.isArray(coursesRes?.data) ? coursesRes.data : [],
          grades: resolveGradesResponse(gradesRes),
          assignments: Array.isArray(assignmentsRes?.data) ? assignmentsRes.data : [],
          events: Array.isArray(eventsRes?.data) ? eventsRes.data : [],
          notifications: Array.isArray(notificationsRes?.data?.notifications)
            ? notificationsRes.data.notifications
            : [],
          unreadCount: notificationsRes?.data?.unreadCount || 0,
          statistics: statsRes?.data || null,
        });
        setHasLoadedOnce(true);
      } catch (error) {
        if (cancelled) return;

        if (error instanceof Error && error.message.includes('401')) {
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('moodleToken');
          toast.error(t('dashboard.sessionExpired'));
          router.push('/login');

          return;
        }

        console.error(error);
        toast.error(t('dashboard.loadError'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, sortOrder, dateFrom, dateTo, hideCompleted]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);

    const menuButton = document.querySelector<HTMLButtonElement>(`.${styles.mobileMenuBtn}`);

    menuButton?.focus();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
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
            <h2 className={styles.pageTitle}>{t(PAGE_TITLE_KEYS[activeKey])}</h2>
          </div>
          {loading && !hasCachedData ? (
            <DashboardSkeleton />
          ) : (
            <>
              {loading && hasCachedData && (
                <div className={styles.contentLoading}>
                  <Spinner size="small" tip="Оновлення..." />
                </div>
              )}
              <motion.div
                key={activeKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderActiveContent()}
              </motion.div>
            </>
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
