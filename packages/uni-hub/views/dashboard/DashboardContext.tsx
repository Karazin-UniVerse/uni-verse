'use client';

import React, { createContext, useContext, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { isLoggedIn } from '@core/utils/auth';
import { useFeatures } from '@uni-hub/features';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import { endSession } from '@uni-hub/services/api.session';
import { fallbackStudentProfile } from './constants';
import { useDashboardData } from './hooks/useDashboardData';
import { useMoodleLink } from './hooks/useMoodleLink';
import { invalidateOpportunities } from './tabs/opportunities/cache';
import { ROUTE } from './routes';
import type { DashboardContextValue } from './types';

const DashboardContext = createContext<DashboardContextValue | null>(null);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const features = useFeatures();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hideCompleted, setHideCompleted] = useState(false);

  const moodleLink = useMoodleLink({
    onLinkSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: moodleKeys.all });

      if (pathname === ROUTE.ConnectMoodle) {
        router.push(ROUTE.Wall);
      }
    },
    onUnlinkSuccess: () => {
      queryClient.removeQueries({ queryKey: moodleKeys.all });
    },
  });

  const dashboard = useDashboardData({
    sortOrder,
    dateFrom,
    dateTo,
    hideCompleted,
    enabled: features.isMoodleIntegrationEnabled && moodleLink.isMoodleLinked && isLoggedIn(),
    onUnauthorized: (): void => {
      endSession(queryClient);
      router.push('/login');
    },
  });

  const { data } = dashboard;
  const hasCachedData =
    data.courses.length > 0 ||
    data.grades.length > 0 ||
    data.assignments.length > 0 ||
    data.events.length > 0 ||
    dashboard.hasLoadedOnce;

  const refresh = (): void => {
    void invalidateOpportunities(queryClient);
    void dashboard.refresh();
  };

  const value: DashboardContextValue = {
    ...moodleLink,
    data,
    loading: dashboard.loading,
    isOfflineData: dashboard.isOfflineData,
    lastSyncTime: dashboard.lastSyncTime,
    hasCachedData,
    activeStudentProfile: dashboard.studentProfile ?? fallbackStudentProfile,
    refresh,
    dateFrom,
    dateTo,
    sortOrder,
    hideCompleted,
    setDateFrom,
    setDateTo,
    setSortOrder,
    setHideCompleted,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = (): DashboardContextValue => {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }

  return context;
};
