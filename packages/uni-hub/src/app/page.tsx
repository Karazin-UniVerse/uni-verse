'use client';

import React, { Suspense } from 'react';
import DashboardPage from '@uni-hub/views/DashboardPage';
import { DashboardSkeleton } from '@uni-hub/components/dashboard';

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPage />
    </Suspense>
  );
}
