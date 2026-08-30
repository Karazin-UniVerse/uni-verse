'use client';

import React, { Suspense } from 'react';
import DashboardPage from '../views/DashboardPage';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPage />
    </Suspense>
  );
}
