import { queryOptions } from '@tanstack/react-query';
import type { CourseSection, SubmissionStatus } from '@core/types/moodle';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { createLimiter } from '@uni-hub/utils/concurrency';
import { moodleKeys } from './queryKeys';

const ASSIGNMENT_STATUS_MAX_CONCURRENT = 10;

const limitAssignmentStatusRequests = createLimiter(ASSIGNMENT_STATUS_MAX_CONCURRENT);

function filterVisibleSections(sections: CourseSection[]): CourseSection[] {
  return sections.filter((section) => section.name && section.modules.length > 0);
}

export function loadAssignmentStatus(assignmentId: number): Promise<SubmissionStatus> {
  return limitAssignmentStatusRequests(async () => {
    const response = await moodleApi.getAssignmentStatus(assignmentId);

    return response.data;
  });
}

export function courseContentsQueryOptions(courseId: number) {
  return queryOptions({
    queryKey: moodleKeys.courseContents(courseId),
    queryFn: async () => filterVisibleSections((await moodleApi.getCourseContents(courseId)).data),
  });
}

export function assignmentStatusQueryOptions(assignmentId: number) {
  return queryOptions({
    queryKey: moodleKeys.assignmentStatus(assignmentId),
    queryFn: () => loadAssignmentStatus(assignmentId),
  });
}
