'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { endSession } from '@uni-hub/services/api.session';
import { isMoodleUnlinked, isUnauthorizedError } from './helpers';
import { useDashboardData } from './useDashboardData';

export function useDashboardErrorHandling(): void {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const { error, errorUpdatedAt, isOfflineData } = useDashboardData();
  const handledErrorAt = useRef(0);

  useEffect(() => {
    if (!error || errorUpdatedAt === handledErrorAt.current || isMoodleUnlinked()) {
      return;
    }

    handledErrorAt.current = errorUpdatedAt;

    if (isUnauthorizedError(error)) {
      toast.error(formatMessage('dashboard.sessionExpired'));
      endSession(queryClient);
      router.push('/login');

      return;
    }

    console.error(error);

    if (isOfflineData) {
      toast.info(formatMessage('dashboard.offlineNotice'));
    } else {
      toast.error(formatMessage('dashboard.loadError'));
    }
  }, [error, errorUpdatedAt, isOfflineData, toast, formatMessage, queryClient, router]);
}
