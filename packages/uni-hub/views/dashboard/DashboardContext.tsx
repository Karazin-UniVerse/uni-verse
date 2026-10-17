'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
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

  const onLinkSuccess = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: moodleKeys.all });

    if (pathname === ROUTE.ConnectMoodle) {
      router.push(ROUTE.Wall);
    }
  }, [queryClient, pathname, router]);

  const onUnlinkSuccess = useCallback((): void => {
    queryClient.removeQueries({ queryKey: moodleKeys.all });
  }, [queryClient]);

  const {
    isMoodleLinked,
    linkModalMode,
    isLinkModalOpen,
    isUnlinkModalOpen,
    openLinkModal,
    closeLinkModal,
    openUnlinkModal,
    closeUnlinkModal,
    setIsMoodleLinked,
    handleLinkSuccess,
    handleUnlinkSuccess,
  } = useMoodleLink({ onLinkSuccess, onUnlinkSuccess });

  const dashboard = useDashboardData({
    sortOrder,
    dateFrom,
    dateTo,
    hideCompleted,
    enabled: features.isMoodleIntegrationEnabled && isMoodleLinked && isLoggedIn(),
    onUnauthorized: (): void => {
      endSession(queryClient);
      router.replace('/login');
    },
  });

  const {
    data,
    loading,
    isOfflineData,
    lastSyncTime,
    studentProfile,
    hasLoadedOnce,
    refresh: refreshDashboard,
  } = dashboard;
  const hasCachedData =
    data.courses.length > 0 ||
    data.grades.length > 0 ||
    data.assignments.length > 0 ||
    data.events.length > 0 ||
    hasLoadedOnce;
  const activeStudentProfile = studentProfile ?? fallbackStudentProfile;

  const refresh = useCallback((): void => {
    void invalidateOpportunities(queryClient);
    void refreshDashboard();
  }, [queryClient, refreshDashboard]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      data,
      loading,
      isOfflineData,
      lastSyncTime,
      hasCachedData,
      activeStudentProfile,
      refresh,
      dateFrom,
      dateTo,
      sortOrder,
      hideCompleted,
      setDateFrom,
      setDateTo,
      setSortOrder,
      setHideCompleted,
      isMoodleLinked,
      setIsMoodleLinked,
      linkModalMode,
      isLinkModalOpen,
      isUnlinkModalOpen,
      openLinkModal,
      closeLinkModal,
      openUnlinkModal,
      closeUnlinkModal,
      handleLinkSuccess,
      handleUnlinkSuccess,
    }),
    [
      data,
      loading,
      isOfflineData,
      lastSyncTime,
      hasCachedData,
      activeStudentProfile,
      refresh,
      dateFrom,
      dateTo,
      sortOrder,
      hideCompleted,
      isMoodleLinked,
      setIsMoodleLinked,
      linkModalMode,
      isLinkModalOpen,
      isUnlinkModalOpen,
      openLinkModal,
      closeLinkModal,
      openUnlinkModal,
      closeUnlinkModal,
      handleLinkSuccess,
      handleUnlinkSuccess,
    ],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = (): DashboardContextValue => {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }

  return context;
};
