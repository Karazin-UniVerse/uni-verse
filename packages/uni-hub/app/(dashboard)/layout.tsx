'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@uni-hub/components/dashboard';

// The dashboard reads the session, the Moodle link and cached data from browser storage, so it is rendered on the client only to avoid hydration mismatches.
const DashboardRoot = dynamic(
  () => import('@uni-hub/views/dashboard/DashboardRoot').then((module) => module.DashboardRoot),
  { ssr: false, loading: () => <DashboardSkeleton /> },
);

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  return <DashboardRoot>{children}</DashboardRoot>;
}
