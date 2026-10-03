'use client';

import { useState, useRef } from 'react';
import { moodleApi } from '@uni-hub/services/api';
import type { StudentProfile } from '@core/types';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { DashboardData } from '../types';
import {
  assembleDashboardData,
  buildAssignmentParams,
  buildFallbackData,
  clearUserSessionStorage,
  getInitialSyncTime,
  isMoodleUnlinked,
  isUnauthorizedError,
  loadCachedDashboardData,
  persistDashboardSnapshot,
  syncStudentProfile,
} from './helpers';

export { clearUserSessionStorage } from './helpers';

export interface UseDashboardDataOptions {
  sortOrder: 'asc' | 'desc';
  dateFrom: string;
  dateTo: string;
  hideCompleted: boolean;
  onUnauthorized: () => void;
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
      const params = buildAssignmentParams({ sortOrder, dateFrom, dateTo, hideCompleted });
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
      syncStudentProfile(profileRes?.data, setStudentProfile);

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
        setData((previous) =>
          buildFallbackData({
            cachedData,
            previousData: previous,
            hideCompleted,
            dateFrom,
            dateTo,
          }),
        );
        setIsOfflineData(true);
        setHasLoadedOnce(true);
        toast.info(formatMessage('dashboard.offlineNotice'));

        return;
      }

      if (!isMoodleUnlinked()) {
        toast.error(formatMessage('dashboard.loadError'));
      }
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
