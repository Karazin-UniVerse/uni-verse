'use client';

import { useParams } from 'next/navigation';
import { Empty } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { CourseContents, parseRouteId } from '@uni-hub/views/dashboard';

export default function Page() {
  const params = useParams<{ courseId: string }>();
  const { formatMessage } = useLanguage();
  const courseId = parseRouteId(params.courseId);

  return courseId === null ? (
    <Empty description={formatMessage('common.error.load')} />
  ) : (
    <CourseContents courseId={courseId} />
  );
}
