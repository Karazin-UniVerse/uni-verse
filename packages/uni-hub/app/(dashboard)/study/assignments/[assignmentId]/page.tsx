'use client';

import { Suspense } from 'react';
import { AssignmentPage } from '@uni-hub/views/dashboard';

export default function Page() {
  return (
    <Suspense>
      <AssignmentPage />
    </Suspense>
  );
}
