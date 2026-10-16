'use client';

import type { ReactNode } from 'react';
import { DashboardProvider, DashboardShell } from '@uni-hub/views/dashboard';

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
