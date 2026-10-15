'use client';

import { useEffect, useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useToast } from '@una';
import type { StudentProfile } from '@core/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { DashboardData } from '../types';
import {
  buildFallbackData,
  deriveDashboardState,
  getInitialSyncTime,
  getInitialUserProfile,
  isMoodleUnlinked,
  isUnauthorizedError,
  loadCachedDashboardData,
  type DashboardState,
} from './helpers';
import { dashboardQueryOptions, profileQueryOptions } from './queries';

export const EMPTY_DASHBOARD_DATA: DashboardData = {
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

export interface UseDashboardDataResult extends DashboardState {
  data: DashboardData;
  studentProfile: StudentProfile | null;
  refresh: () => Promise<void>;
}

interface DashboardSnapshot {
  data: DashboardData;
  updatedAt: number | undefined;
}

function readDashboardSnapshot(): DashboardSnapshot | undefined {
  const cachedData = loadCachedDashboardData();

  if (!cachedData) {
    return undefined;
  }

  return {
    data: { ...EMPTY_DASHBOARD_DATA, ...cachedData },
    updatedAt: getInitialSyncTime() ?? undefined,
  };
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
    initialData: () => readDashboardSnapshot()?.data,
    initialDataUpdatedAt: () => readDashboardSnapshot()?.updatedAt,
  });
  const profileQuery = useQuery({
    ...profileQueryOptions,
    enabled,
    placeholderData: () => getInitialUserProfile() ?? undefined,
  });

  const { error, errorUpdatedAt, data: queryData } = dashboardQuery;

  useEffect(() => {
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

    if (queryData) {
      toast.info(formatMessage('dashboard.offlineNotice'));
    } else {
      toast.error(formatMessage('dashboard.loadError'));
    }
  }, [error, errorUpdatedAt, queryData, toast, formatMessage, onUnauthorized]);

  const state = deriveDashboardState(dashboardQuery);
  let data = queryData ?? EMPTY_DASHBOARD_DATA;

  if (state.isOfflineData && queryData) {
    data = buildFallbackData({
      cachedData: queryData,
      previousData: EMPTY_DASHBOARD_DATA,
      hideCompleted,
      dateFrom,
      dateTo,
    });
  }

  const refresh = async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    const result = await dashboardQuery.refetch();

    if (!result.isError) {
      toast.success(formatMessage('dashboard.syncSuccess'));
    }
  };

  return { ...state, data, studentProfile: profileQuery.data ?? null, refresh };
}
