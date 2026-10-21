'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@uni-hub/components/dashboard';

// The dashboard reads the session, the Moodle link and cached data from browser storage, so it is rendered on the client only to avoid hydration mismatches.
const DashboardShell = dynamic(
  () =>
    import('@uni-hub/views/dashboard/layout/DashboardShell').then(
      (module) => module.DashboardShell,
    ),
  { ssr: false, loading: () => <DashboardSkeleton /> },
);

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  return <DashboardShell>{children}</DashboardShell>;
}
