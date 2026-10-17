'use client';

import { useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useToast } from '@una';
import { isLoggedIn } from '@core/utils/auth';
import type { StudentProfile } from '@core/types';
import { useFeatures } from '@uni-hub/features';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useMoodleStore } from '@uni-hub/store/useMoodleStore';
import { fallbackStudentProfile } from '../constants';
import type { DashboardData } from '../types';
import {
  buildFallbackData,
  deriveDashboardState,
  getInitialSyncTime,
  getInitialUserProfile,
  loadCachedDashboardData,
  type DashboardState,
} from './helpers';
import { dashboardQueryOptions, profileQueryOptions } from './queries';

const EMPTY_DASHBOARD_DATA: DashboardData = {
  courses: [],
  grades: [],
  assignments: [],
  events: [],
  notifications: [],
  unreadCount: 0,
  statistics: null,
};

export interface UseDashboardDataResult extends Omit<DashboardState, 'cachedData'> {
  data: DashboardData;
  studentProfile: StudentProfile;
  hasCachedData: boolean;
  error: Error | null;
  errorUpdatedAt: number;
  refresh: () => Promise<void>;
}

function readDashboardSnapshot(): DashboardData | undefined {
  const cachedData = loadCachedDashboardData();

  return cachedData ? { ...EMPTY_DASHBOARD_DATA, ...cachedData } : undefined;
}

export function useDashboardData(): UseDashboardDataResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const features = useFeatures();
  const sortOrder = useMoodleStore((state) => state.sortOrder);
  const dateFrom = useMoodleStore((state) => state.dateFrom);
  const dateTo = useMoodleStore((state) => state.dateTo);
  const hideCompleted = useMoodleStore((state) => state.hideCompleted);
  const isMoodleLinked = useMoodleStore((state) => state.isMoodleLinked);
  const enabled = features.isMoodleIntegrationEnabled && isMoodleLinked && isLoggedIn();

  const dashboardQuery = useQuery({
    ...dashboardQueryOptions({ sortOrder, dateFrom, dateTo, hideCompleted }),
    enabled,
    placeholderData: keepPreviousData,
    initialData: readDashboardSnapshot,
    initialDataUpdatedAt: 0,
    refetchOnWindowFocus: false,
  });
  const profileQuery = useQuery({
    ...profileQueryOptions,
    enabled,
    initialData: () => getInitialUserProfile() ?? undefined,
    initialDataUpdatedAt: 0,
  });

  const { error, errorUpdatedAt, data: queryData, isError } = dashboardQuery;

  const snapshot = useMemo(
    () => (isError && queryData === undefined ? readDashboardSnapshot() : undefined),
    [isError, queryData],
  );
  const state = deriveDashboardState({ ...dashboardQuery, snapshot });
  const { cachedData } = state;

  let data = cachedData ?? EMPTY_DASHBOARD_DATA;

  if (state.isOfflineData && cachedData) {
    data = buildFallbackData({
      cachedData,
      previousData: EMPTY_DASHBOARD_DATA,
      hideCompleted,
      dateFrom,
      dateTo,
    });
  }

  const { refetch } = dashboardQuery;
  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    const result = await refetch();

    if (!result.isError) {
      toast.success(formatMessage('dashboard.syncSuccess'));
    }
  }, [enabled, refetch, toast, formatMessage]);

  return {
    loading: state.loading,
    hasLoadedOnce: state.hasLoadedOnce,
    isOfflineData: state.isOfflineData,
    lastSyncTime: state.lastSyncTime ?? getInitialSyncTime(),
    data,
    studentProfile: profileQuery.data ?? fallbackStudentProfile,
    hasCachedData:
      data.courses.length > 0 ||
      data.grades.length > 0 ||
      data.assignments.length > 0 ||
      data.events.length > 0 ||
      state.hasLoadedOnce,
    error,
    errorUpdatedAt,
    refresh,
  };
}
