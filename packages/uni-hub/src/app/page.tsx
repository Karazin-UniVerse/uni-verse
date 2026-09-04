'use client';

import React, { Suspense } from 'react';
import DashboardPage from '@uni-hub/views/DashboardPage';
import { DashboardSkeleton } from '@uni-hub/components/DashboardSkeleton';

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPage />
    </Suspense>
  );
}
