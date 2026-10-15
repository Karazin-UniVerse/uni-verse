import { useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { Assignment, SubmissionStatus } from '@core/types/moodle';
import { assignmentStatusQueryOptions } from '@uni-hub/queries/moodle/queries';

export type AssignmentLocalStatuses = Record<number, { status?: string; grade?: string }>;

export function getAssignmentsNeedingStatus(assignments: Assignment[]): number[] {
  return [...new Set(assignments.filter((item) => !item.submissionStatus).map((item) => item.id))];
}

export function toLocalStatuses(
  ids: number[],
  results: Array<{ data: SubmissionStatus | undefined }>,
): AssignmentLocalStatuses {
  const statuses: AssignmentLocalStatuses = {};

  results.forEach((result, index) => {
    if (result.data) {
      statuses[ids[index]] = { status: result.data.status, grade: result.data.grade };
    }
  });

  return statuses;
}

export function useAssignmentStatuses(assignments: Assignment[]): AssignmentLocalStatuses {
  const ids = useMemo(() => getAssignmentsNeedingStatus(assignments), [assignments]);
  const combine = useCallback(
    (results: Array<{ data: SubmissionStatus | undefined }>) => toLocalStatuses(ids, results),
    [ids],
  );

  return useQueries({
    queries: ids.map((id) => assignmentStatusQueryOptions(id)),
    combine,
  });
}
