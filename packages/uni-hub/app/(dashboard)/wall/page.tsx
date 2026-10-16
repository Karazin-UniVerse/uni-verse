'use client';

import { useRouter } from 'next/navigation';
import { OverviewTab, getNavHref, useDashboard } from '@uni-hub/views/dashboard';

export default function Page() {
  const router = useRouter();
  const { data, loading, activeStudentProfile, isMoodleLinked } = useDashboard();

  return (
    <OverviewTab
      courses={data.courses}
      events={data.events}
      assignments={data.assignments}
      grades={data.grades}
      statistics={data.statistics}
      activeStudentProfile={activeStudentProfile}
      loading={loading}
      onNavigate={(navKey, studyView) => router.push(getNavHref(navKey, studyView))}
      isMoodleLinked={isMoodleLinked}
    />
  );
}
