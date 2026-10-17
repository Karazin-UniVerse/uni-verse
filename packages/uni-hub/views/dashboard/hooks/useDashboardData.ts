'use client';

import { useState, useRef } from 'react';
import { moodleApi } from '@uni-hub/services/api';
import { notificationsApi, type PlatformNotification } from '@uni-hub/services/api.notifications';
import type { StudentProfile } from '@core/types';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { DashboardData } from '../types';
import {
  applyPlatformNotifications,
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
  enabled?: boolean;
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

function isAbortedMoodleFetch(requestId: number, currentRequestId: number): boolean {
  return requestId !== currentRequestId || isMoodleUnlinked();
}

async function loadPlatformNotifications(): Promise<{ data: PlatformNotification[] } | null> {
  try {
    return await notificationsApi.getMyNotifications();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      throw error;
    }

    console.error('Failed to load platform notifications', error);

    return null;
  }
}

export function useDashboardData({
  sortOrder,
  dateFrom,
  dateTo,
  hideCompleted,
  onUnauthorized,
  enabled = true,
}: UseDashboardDataOptions) {
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const [loading, setLoading] = useState(enabled);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(getInitialHasLoadedOnce);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(getInitialSyncTime);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [data, setData] = useState<DashboardData>(getInitialDashboardData);

  const fetchRequestIdRef = useRef(0);

  const handleUnauthorized = (): void => {
    clearUserSessionStorage();
    toast.error(formatMessage('dashboard.sessionExpired'));
    onUnauthorized();
  };

  const syncPlatformOnly = async (requestId: number): Promise<void> => {
    setLoading(false);

    try {
      const platformResponse = await loadPlatformNotifications();

      if (requestId === fetchRequestIdRef.current && platformResponse) {
        setData((previous) => applyPlatformNotifications(previous, platformResponse.data));
      }
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        throw error;
      }

      if (requestId === fetchRequestIdRef.current) {
        handleUnauthorized();
      }
    }
  };

  const fetchData = async (isManual = false): Promise<void> => {
    const requestId = ++fetchRequestIdRef.current;

    if (!enabled || isMoodleUnlinked()) {
      await syncPlatformOnly(requestId);

      return;
    }

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
        platformNotificationsRes,
      ] = await Promise.all([
        moodleApi.getCourses(),
        moodleApi.getGrades(),
        moodleApi.getAssignments(params),
        moodleApi.getEvents(),
        moodleApi.getNotifications(),
        moodleApi.getStatistics(),
        moodleApi.getProfile().catch(() => null),
        loadPlatformNotifications(),
      ]);

      if (isAbortedMoodleFetch(requestId, fetchRequestIdRef.current)) {
        return;
      }

      const freshData = assembleDashboardData(
        [
          coursesRes,
          gradesRes,
          assignmentsRes,
          eventsRes,
          notificationsRes,
          statsRes,
        ],
        platformNotificationsRes?.data,
      );

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
      if (isAbortedMoodleFetch(requestId, fetchRequestIdRef.current)) {
        return;
      }

      if (isUnauthorizedError(error)) {
        handleUnauthorized();

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

      toast.error(formatMessage('dashboard.loadError'));
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const cancelPendingFetch = (): void => {
    fetchRequestIdRef.current += 1;
    setLoading(false);
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
