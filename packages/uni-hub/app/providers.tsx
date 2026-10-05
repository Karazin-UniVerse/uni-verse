'use client';

import React from 'react';
import { FeatureToggleProvider, DevFeaturePanel } from '@uni-hub/features';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { ToastProvider } from '@una';

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <FeatureToggleProvider>
      <LanguageProvider>
        <ThemeProvider>
          <ToastProvider>
            {children}
            <DevFeaturePanel />
          </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </FeatureToggleProvider>
  );
}
