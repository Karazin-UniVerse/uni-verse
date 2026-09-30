'use client';

import { useState, useRef } from 'react';
import { moodleApi } from '@uni-hub/services/api';
import type { StudentProfile } from '@core/types';
import type { Grade, Assignment } from '@uni-hub/types';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { DashboardData } from '../types';

export type GradesApiResponse = Awaited<ReturnType<typeof moodleApi.getGrades>>;

export function parseDateFilterSeconds(dateString?: string): number | null {
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

export function resolveGradesResponse(gradesResponse?: GradesApiResponse | null): Grade[] {
  if (Array.isArray(gradesResponse?.data?.grades)) {
    return gradesResponse.data.grades;
  }

  return [];
}

export type MoodleApiResponseTuple = [
  Awaited<ReturnType<typeof moodleApi.getCourses>>,
  Awaited<ReturnType<typeof moodleApi.getGrades>>,
  Awaited<ReturnType<typeof moodleApi.getAssignments>>,
  Awaited<ReturnType<typeof moodleApi.getEvents>>,
  Awaited<ReturnType<typeof moodleApi.getNotifications>>,
  Awaited<ReturnType<typeof moodleApi.getStatistics>>,
];

export function assembleDashboardData([
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

export function buildAssignmentParams(
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

export function loadCachedDashboardData(): Partial<DashboardData> | null {
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

export function persistDashboardSnapshot(timestamp: number, freshData: DashboardData): void {
  try {
    localStorage.setItem('universe_last_sync_time', String(timestamp));
    localStorage.setItem('universe_dashboard_data', JSON.stringify(freshData));
  } catch {
    // Ignore localStorage quota error
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('401');
}

export function clearUserSessionStorage(): void {
  try {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('moodleToken');
    localStorage.removeItem('isDemo');
    localStorage.removeItem('username');
    localStorage.removeItem('universe_student_profile');
    localStorage.removeItem('universe_dashboard_data');
    localStorage.removeItem('universe_last_sync_time');
  } catch {
    // Ignore storage errors
  }
}

export function filterFallbackAssignments(
  assignments: Assignment[] | undefined,
  hideCompleted: boolean,
  dateFrom?: string,
  dateTo?: string,
): Assignment[] {
  let list = assignments ?? [];

  if (hideCompleted) {
    list = list.filter(
      (assignment) =>
        assignment.submissionStatus !== 'graded' && assignment.submissionStatus !== 'submitted',
    );
  }

  const fromSec = parseDateFilterSeconds(dateFrom);

  if (fromSec !== null) {
    list = list.filter((assignment) => assignment.duedate > 0 && assignment.duedate >= fromSec);
  }

  const toSec = parseDateFilterSeconds(dateTo);

  if (toSec !== null) {
    list = list.filter((assignment) => assignment.duedate > 0 && assignment.duedate <= toSec);
  }

  return list;
}

export interface UseDashboardDataOptions {
  sortOrder: 'asc' | 'desc';
  dateFrom: string;
  dateTo: string;
  hideCompleted: boolean;
  onUnauthorized: () => void;
}

function getInitialSyncTime(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cachedTime = localStorage.getItem('universe_last_sync_time');

    return cachedTime ? Number(cachedTime) : null;
  } catch {
    return null;
  }
}

function getInitialStudentProfile(): StudentProfile | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cachedProfile = localStorage.getItem('universe_student_profile');

    if (cachedProfile) {
      const parsedProfile = JSON.parse(cachedProfile) as StudentProfile;

      return parsedProfile && typeof parsedProfile === 'object' ? parsedProfile : null;
    }

    return null;
  } catch {
    return null;
  }
}

function getInitialDashboardData(): DashboardData {
  const initial: DashboardData = {
    courses: [],
    grades: [],
    assignments: [],
    events: [],
    notifications: [],
    unreadCount: 0,
    statistics: null,
  };

  if (typeof window === 'undefined') {
    return initial;
  }

  try {
    const cachedData = loadCachedDashboardData();

    return cachedData ? { ...initial, ...cachedData } : initial;
  } catch {
    return initial;
  }
}

function getInitialHasLoadedOnce(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return Boolean(loadCachedDashboardData());
  } catch {
    return false;
  }
}

export function useDashboardData({
  sortOrder,
  dateFrom,
  dateTo,
  hideCompleted,
  onUnauthorized,
}: UseDashboardDataOptions) {
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(getInitialHasLoadedOnce);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(getInitialSyncTime);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    getInitialStudentProfile,
  );
  const [data, setData] = useState<DashboardData>(getInitialDashboardData);

  const fetchRequestIdRef = useRef(0);

  const fetchData = async (isManual = false) => {
    const requestId = ++fetchRequestIdRef.current;

    setLoading(true);

    try {
      const params = buildAssignmentParams(sortOrder, dateFrom, dateTo, hideCompleted);
      const [
        coursesRes,
        gradesRes,
        assignmentsRes,
        eventsRes,
        notificationsRes,
        statsRes,
        profileRes,
      ] = await Promise.all([
        moodleApi.getCourses(),
        moodleApi.getGrades(),
        moodleApi.getAssignments(params),
        moodleApi.getEvents(),
        moodleApi.getNotifications(),
        moodleApi.getStatistics(),
        moodleApi.getProfile().catch(() => null),
      ]);

      if (requestId !== fetchRequestIdRef.current) {
        return;
      }

      const freshData = assembleDashboardData([
        coursesRes,
        gradesRes,
        assignmentsRes,
        eventsRes,
        notificationsRes,
        statsRes,
      ]);

      setData(freshData);
      setHasLoadedOnce(true);
      setIsOfflineData(false);

      if (profileRes?.data) {
        setStudentProfile(profileRes.data);

        try {
          localStorage.setItem('universe_student_profile', JSON.stringify(profileRes.data));
        } catch {
          // Ignore storage quota errors
        }
      }

      const nowTimestamp = Date.now();

      setLastSyncTime(nowTimestamp);
      persistDashboardSnapshot(nowTimestamp, freshData);

      if (isManual) {
        toast.success(formatMessage('dashboard.syncSuccess'));
      }
    } catch (error) {
      if (requestId !== fetchRequestIdRef.current) {
        return;
      }

      if (isUnauthorizedError(error)) {
        clearUserSessionStorage();
        toast.error(formatMessage('dashboard.sessionExpired'));
        onUnauthorized();

        return;
      }

      console.error(error);

      const cachedData = loadCachedDashboardData();

      if (cachedData) {
        const fallbackAssignments = filterFallbackAssignments(
          cachedData.assignments,
          hideCompleted,
          dateFrom,
          dateTo,
        );

        setData((previous) => ({
          ...previous,
          ...cachedData,
          assignments: fallbackAssignments,
        }));
        setIsOfflineData(true);
        setHasLoadedOnce(true);
        toast.info(formatMessage('dashboard.offlineNotice'));

        return;
      }

      toast.error(formatMessage('dashboard.loadError'));
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const cancelPendingFetch = () => {
    fetchRequestIdRef.current += 1;
  };

  return {
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
  };
}
