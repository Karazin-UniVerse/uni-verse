'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { endSession } from '@uni-hub/services/api.session';
import { isMoodleUnlinked, isUnauthorizedError } from './helpers';

export interface DashboardErrorHandlingProps {
  error: Error | null;
  errorUpdatedAt: number;
  isOfflineData: boolean;
  platformError: Error | null;
}

export function useDashboardErrorHandling({
  error,
  errorUpdatedAt,
  isOfflineData,
  platformError,
}: DashboardErrorHandlingProps): void {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const handledErrorAt = useRef(0);

  useEffect(() => {
    if (platformError && isUnauthorizedError(platformError)) {
      toast.error(formatMessage('dashboard.sessionExpired'));
      endSession(queryClient);
      router.replace('/login');

      return;
    }

    if (!error || errorUpdatedAt === handledErrorAt.current || isMoodleUnlinked()) {
      return;
    }

    handledErrorAt.current = errorUpdatedAt;

    if (isUnauthorizedError(error)) {
      toast.error(formatMessage('dashboard.sessionExpired'));
      endSession(queryClient);
      router.replace('/login');

      return;
    }

    console.error(error);

    if (isOfflineData) {
      toast.info(formatMessage('dashboard.offlineNotice'));
    } else {
      toast.error(formatMessage('dashboard.loadError'));
    }
  }, [
    error,
    errorUpdatedAt,
    isOfflineData,
    platformError,
    toast,
    formatMessage,
    queryClient,
    router,
  ]);
}
