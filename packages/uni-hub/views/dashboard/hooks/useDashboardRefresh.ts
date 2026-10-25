'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export interface UseDashboardRefreshParams {
  enabled: boolean;
  refetchDashboard: () => Promise<{ isError: boolean }>;
  refetchPlatform: () => Promise<{ isError: boolean }>;
}

export interface UseDashboardRefreshResult {
  isRefreshing: boolean;
  manualSyncTime: number | null;
  refresh: () => Promise<void>;
}

export function useDashboardRefresh({
  enabled,
  refetchDashboard,
  refetchPlatform,
}: UseDashboardRefreshParams): UseDashboardRefreshResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualSyncTime, setManualSyncTime] = useState<number | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);

    try {
      if (!enabled) {
        const platformResult = await refetchPlatform();

        if (!platformResult?.isError) {
          const nowTimestamp = Date.now();

          setManualSyncTime(nowTimestamp);

          try {
            localStorage.setItem('universe_last_sync_time', String(nowTimestamp));
          } catch {
            // ignore storage failure in private mode
          }

          toast.success(formatMessage('dashboard.syncSuccess'));
        } else {
          toast.error(formatMessage('dashboard.loadError'));
        }

        return;
      }

      const [result, platformResult] = await Promise.all([refetchDashboard(), refetchPlatform()]);

      if (!result?.isError && !platformResult?.isError) {
        const nowTimestamp = Date.now();

        setManualSyncTime(nowTimestamp);
        toast.success(formatMessage('dashboard.syncSuccess'));
      } else {
        toast.error(formatMessage('dashboard.loadError'));
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [enabled, refetchDashboard, refetchPlatform, toast, formatMessage]);

  return {
    isRefreshing,
    manualSyncTime,
    refresh,
  };
}
