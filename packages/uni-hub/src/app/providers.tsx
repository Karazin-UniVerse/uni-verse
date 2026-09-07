'use client';

import React from 'react';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { ToastProvider } from '@universe/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
