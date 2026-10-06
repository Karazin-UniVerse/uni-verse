'use client';

import React from 'react';
import { FeatureToggleProvider } from '@uni-hub/components/features';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { ToastProvider } from '@una';

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <FeatureToggleProvider>
      <LanguageProvider>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </FeatureToggleProvider>
  );
}
