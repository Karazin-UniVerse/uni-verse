'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QUERY_STALE_TIME_MS } from '@uni-hub/constants/query';
import { FeatureToggleProvider } from '@uni-hub/features';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { ToastProvider } from '@una';

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: QUERY_STALE_TIME_MS, retry: false } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <FeatureToggleProvider>
        <LanguageProvider>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </LanguageProvider>
      </FeatureToggleProvider>
    </QueryClientProvider>
  );
}
