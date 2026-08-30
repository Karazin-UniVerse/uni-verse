'use client';

import React from 'react';
import { ThemeProvider } from '../theme/ThemeContext';
import { ToastProvider } from '../components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
