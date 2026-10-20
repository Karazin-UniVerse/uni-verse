'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Empty } from '@una';
import { AssignmentDetail } from '@uni-hub/components/assignments';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useDashboardData } from './hooks/useDashboardData';
import { parseRouteId } from './utils';

export const AssignmentPage: React.FC = () => {
  const params = useParams<{ assignmentId: string }>();
  const courseParam = useSearchParams().get('course') ?? undefined;
  const { formatMessage } = useLanguage();
  const { data } = useDashboardData();
  const assignmentId = parseRouteId(params.assignmentId);

  if (assignmentId === null) {
    return <Empty description={formatMessage('common.error.load')} />;
  }

  return (
    <AssignmentDetail
      assignmentId={assignmentId}
      courseId={parseRouteId(courseParam)}
      assignment={data.assignments.find((assignment) => assignment.id === assignmentId)}
    />
  );
};
