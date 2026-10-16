'use client';

import { useParams } from 'next/navigation';
import { Empty } from '@una';
import { AssignmentDetail } from '@uni-hub/components/assignments';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { parseRouteId, useDashboard } from '@uni-hub/views/dashboard';

export default function Page() {
  const params = useParams<{ assignmentId: string }>();
  const { formatMessage } = useLanguage();
  const { data } = useDashboard();
  const assignmentId = parseRouteId(params.assignmentId);

  if (assignmentId === null) {
    return <Empty description={formatMessage('common.error.load')} />;
  }

  return (
    <AssignmentDetail
      assignmentId={assignmentId}
      assignment={data.assignments.find((assignment) => assignment.id === assignmentId)}
    />
  );
}
