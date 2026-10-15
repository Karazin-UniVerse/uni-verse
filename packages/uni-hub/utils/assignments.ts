import type { Assignment } from '@uni-hub/types';

export function isAssignmentCompleted(
  assignment: Pick<Assignment, 'submissionStatus' | 'graded' | 'grade' | 'submittedAt'>,
): boolean {
  return (
    assignment.submissionStatus === 'submitted' ||
    assignment.submissionStatus === 'graded' ||
    Boolean(assignment.graded) ||
    Boolean(assignment.grade) ||
    Boolean(assignment.submittedAt)
  );
}
