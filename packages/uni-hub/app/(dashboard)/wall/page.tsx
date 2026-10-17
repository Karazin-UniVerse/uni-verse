'use client';

import { useRouter } from 'next/navigation';
import { useMoodleStore } from '@uni-hub/store/useMoodleStore';
import { OverviewTab, getNavHref } from '@uni-hub/views/dashboard';
import { useDashboardData } from '@uni-hub/views/dashboard/hooks/useDashboardData';

export default function Page() {
  const router = useRouter();
  const { data, loading, studentProfile } = useDashboardData();
  const isMoodleLinked = useMoodleStore((state) => state.isMoodleLinked);

  return (
    <OverviewTab
      courses={data.courses}
      events={data.events}
      assignments={data.assignments}
      grades={data.grades}
      statistics={data.statistics}
      activeStudentProfile={studentProfile}
      loading={loading}
      onNavigate={(navKey, studyView) => router.push(getNavHref(navKey, studyView))}
      isMoodleLinked={isMoodleLinked}
    />
  );
}
