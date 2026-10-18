'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useToast } from '@una';
import type { StudentProfile } from '@core/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { DashboardData } from '../types';
import {
  applyPlatformNotifications,
  buildFallbackData,
  deriveDashboardState,
  getInitialSyncTime,
  getInitialUserProfile,
  isMoodleUnlinked,
  isUnauthorizedError,
  loadCachedDashboardData,
  type DashboardState,
} from './helpers';
import {
  dashboardQueryOptions,
  platformNotificationsQueryOptions,
  profileQueryOptions,
} from './queries';

const EMPTY_DASHBOARD_DATA: DashboardData = {
  courses: [],
  grades: [],
  assignments: [],
  events: [],
  notifications: [],
  unreadCount: 0,
  statistics: null,
};

export interface UseDashboardDataOptions {
  sortOrder: 'asc' | 'desc';
  dateFrom: string;
  dateTo: string;
  hideCompleted: boolean;
  onUnauthorized: () => void;
  enabled?: boolean;
}

export interface UseDashboardDataResult extends Omit<DashboardState, 'cachedData'> {
  data: DashboardData;
  studentProfile: StudentProfile | null;
  refresh: () => Promise<void>;
}

function readDashboardSnapshot(): DashboardData | undefined {
  const cachedData = loadCachedDashboardData();

  return cachedData ? { ...EMPTY_DASHBOARD_DATA, ...cachedData } : undefined;
}

export function useDashboardData({
  sortOrder,
  dateFrom,
  dateTo,
  hideCompleted,
  onUnauthorized,
  enabled = true,
}: UseDashboardDataOptions): UseDashboardDataResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const handledErrorAt = useRef(0);

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
  const platformQuery = useQuery({
    ...platformNotificationsQueryOptions,
  });

  const { error, errorUpdatedAt, data: queryData, isError } = dashboardQuery;
  const platformError = platformQuery.error;

  const snapshot = useMemo(
    () => (isError && queryData === undefined ? readDashboardSnapshot() : undefined),
    [isError, queryData],
  );
  const state = deriveDashboardState({ ...dashboardQuery, snapshot });
  const { cachedData } = state;

  useEffect(() => {
    if (platformError && isUnauthorizedError(platformError)) {
      toast.error(formatMessage('dashboard.sessionExpired'));
      onUnauthorized();

      return;
    }

    if (!error || errorUpdatedAt === handledErrorAt.current || isMoodleUnlinked()) {
      return;
    }

    handledErrorAt.current = errorUpdatedAt;

    if (isUnauthorizedError(error)) {
      toast.error(formatMessage('dashboard.sessionExpired'));
      onUnauthorized();

      return;
    }

    console.error(error);

    if (cachedData) {
      toast.info(formatMessage('dashboard.offlineNotice'));
    } else {
      toast.error(formatMessage('dashboard.loadError'));
    }
  }, [error, errorUpdatedAt, platformError, cachedData, toast, formatMessage, onUnauthorized]);

  let data = cachedData ?? EMPTY_DASHBOARD_DATA;

  if (state.isOfflineData && cachedData) {
    data = buildFallbackData({
      cachedData,
      previousData: EMPTY_DASHBOARD_DATA,
      hideCompleted,
      dateFrom,
      dateTo,
      platformNotifications: platformQuery.data,
    });
  } else if (platformQuery.data) {
    data = applyPlatformNotifications(data, platformQuery.data);
  }

  const { refetch } = dashboardQuery;
  const { refetch: refetchPlatform } = platformQuery;
  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) {
      await refetchPlatform();

      return;
    }

    const [result] = await Promise.all([refetch(), refetchPlatform()]);

    if (!result?.isError) {
      toast.success(formatMessage('dashboard.syncSuccess'));
    }
  }, [enabled, refetch, refetchPlatform, toast, formatMessage]);

  return {
    loading: state.loading,
    hasLoadedOnce: state.hasLoadedOnce,
    isOfflineData: state.isOfflineData,
    lastSyncTime: state.lastSyncTime ?? getInitialSyncTime(),
    data,
    studentProfile: profileQuery.data ?? null,
    refresh,
  };
}
