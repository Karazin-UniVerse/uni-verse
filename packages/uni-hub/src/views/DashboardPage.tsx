'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { RotateCw, AlertCircle } from 'lucide-react';
import { Button as UnaButton, useToast } from '@una';
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
import styles from './DashboardPage.module.scss';

const PAGE_TITLES: Record<NavKey, string> = {
  overview: 'Картка студента / Огляд',
  courses: 'Індивідуальний план',
  grades: 'Заліковка та бали',
  schedule: 'Розклад занять',
  assignments: 'Завдання',
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

function formatLastSync(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

type MoodleApiResponseTuple = [
  Awaited<ReturnType<typeof moodleApi.getCourses>>,
  Awaited<ReturnType<typeof moodleApi.getGrades>>,
  Awaited<ReturnType<typeof moodleApi.getAssignments>>,
  Awaited<ReturnType<typeof moodleApi.getEvents>>,
  Awaited<ReturnType<typeof moodleApi.getNotifications>>,
  Awaited<ReturnType<typeof moodleApi.getStatistics>>,
];

function assembleDashboardData([
  coursesRes,
  gradesRes,
  assignmentsRes,
  eventsRes,
  notificationsRes,
  statsRes,
]: MoodleApiResponseTuple): DashboardData {
  return {
    courses: Array.isArray(coursesRes?.data) ? coursesRes.data : [],
    grades: resolveGradesResponse(gradesRes),
    assignments: Array.isArray(assignmentsRes?.data) ? assignmentsRes.data : [],
    events: Array.isArray(eventsRes?.data) ? eventsRes.data : [],
    notifications: Array.isArray(notificationsRes?.data?.notifications)
      ? notificationsRes.data.notifications
      : [],
    unreadCount: notificationsRes?.data?.unreadCount || 0,
    statistics: statsRes?.data || null,
  };
}

function buildAssignmentParams(
  sortOrder: 'asc' | 'desc',
  dateFrom: string,
  dateTo: string,
  hideCompleted: boolean,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    sortByDate: sortOrder,
    includeStatus: true,
  };
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

  return params;
}

function loadCachedDashboardData(): Partial<DashboardData> | null {
  try {
    const raw = localStorage.getItem('universe_dashboard_data');

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<DashboardData>;

    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function persistDashboardSnapshot(timestamp: number, freshData: DashboardData): void {
  try {
    localStorage.setItem('universe_last_sync_time', String(timestamp));
    localStorage.setItem('universe_dashboard_data', JSON.stringify(freshData));
  } catch {
    // Ignore localStorage quota error
  }
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('401');
}

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const checkIn = useGamificationStore((s) => s.checkIn);
  const soundEnabled = useGamificationStore((s) => s.soundEnabled);
  const setSoundEnabled = useGamificationStore((s) => s.setSoundEnabled);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<NavKey>('overview');
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [selectedDueUnixSec, setSelectedDueUnixSec] = useState<number | undefined>();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const activeStudentProfile = studentProfile ?? fallbackStudentProfile;

  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isOfflineData, setIsOfflineData] = useState(false);

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
    try {
      const cachedTime = localStorage.getItem('universe_last_sync_time');

      if (cachedTime) {
        setLastSyncTime(Number(cachedTime));
      }

      const cachedData = loadCachedDashboardData();

      if (cachedData) {
        setData((previous) => ({
          ...previous,
          ...cachedData,
        }));
        setHasLoadedOnce(true);
      }
    } catch {
      // Ignore cache read errors
    }
  }, []);

  const fetchData = async (isManual = false) => {
    setLoading(true);

    try {
      const params = buildAssignmentParams(sortOrder, dateFrom, dateTo, hideCompleted);
      const responses = await Promise.all([
        moodleApi.getCourses(),
        moodleApi.getGrades(),
        moodleApi.getAssignments(params),
        moodleApi.getEvents(),
        moodleApi.getNotifications(),
        moodleApi.getStatistics(),
      ]);

      const freshData = assembleDashboardData(responses);

      setData(freshData);
      setHasLoadedOnce(true);
      setIsOfflineData(false);

      const nowTimestamp = Date.now();

      setLastSyncTime(nowTimestamp);
      persistDashboardSnapshot(nowTimestamp, freshData);

      if (isManual) {
        toast.success('Дані успішно оновлено');
      }
    } catch (error) {
      if (isUnauthorizedError(error)) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('moodleToken');
        toast.error('Сесія застаріла або недійсна. Будь ласка, увійдіть знову.');
        router.push('/login');

        return;
      }

      console.error(error);

      const cachedData = loadCachedDashboardData();

      if (cachedData) {
        setData((previous) => ({
          ...previous,
          ...cachedData,
        }));
        setIsOfflineData(true);
        setHasLoadedOnce(true);
        toast.info("Використовуються збережені дані: немає зв'язку з сервером Moodle.");

        return;
      }

      toast.error('Помилка завантаження даних. Будь ласка, переконайтеся, що бекенд запущено.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('demo') === 'true') {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('accessToken', 'demo-token');
      localStorage.setItem('moodleToken', 'demo-token');
      localStorage.setItem('isDemo', 'true');
    }

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
  }, [checkIn, router, searchParams]);

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

    fetchData();
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
            <h2 className={styles.pageTitle}>{PAGE_TITLES[activeKey]}</h2>
            <div className={styles.syncActions}>
              {lastSyncTime && (
                <span className={styles.lastSyncText}>
                  Дані оновлено: {formatLastSync(lastSyncTime)}
                </span>
              )}
              <UnaButton
                type="button"
                variant="secondary"
                size="small"
                onClick={() => fetchData(true)}
                disabled={loading}
                aria-label="Оновити дані"
                className={styles.refreshBtn}
              >
                <RotateCw size={14} className={clsx(styles.refreshIcon, loading && styles.spin)} />
                <span>Оновити</span>
              </UnaButton>
            </div>
          </div>

          {isOfflineData && (
            <div className={styles.offlineBanner} role="alert">
              <AlertCircle size={16} className={styles.offlineIcon} />
              <span>
                Увага: відсутній зв&apos;язок з сервером Moodle. Відображаються збережені дані
                {lastSyncTime ? ` від ${formatLastSync(lastSyncTime)}` : ''}.
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
