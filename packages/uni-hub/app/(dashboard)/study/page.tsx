'use client';

import { Suspense } from 'react';
import { StudyPage } from '@uni-hub/views/dashboard';

export default function Page() {
  return (
    <Suspense>
      <StudyPage />
    </Suspense>
  );
}
