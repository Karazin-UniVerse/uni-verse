import styles from './RecentGradesFeed.module.scss';

export function getScoreToneClass(gradeStr: string | null | undefined): string {
  if (!gradeStr) {
    return styles.toneInfo;
  }

  const numeric = Number.parseFloat(gradeStr.replace(/[^\d.-]/g, ''));

  if (Number.isNaN(numeric)) {
    return styles.toneInfo;
  }

  if (numeric >= 90) {
    return styles.toneSuccess;
  }

  if (numeric >= 75) {
    return styles.toneInfo;
  }

  if (numeric >= 60) {
    return styles.toneWarning;
  }

  return styles.toneDanger;
}

export function formatRecentGradeDate(
  timestamp: number | null | undefined,
  locale = 'uk-UA',
  fallback = 'Нещодавно',
): string {
  if (!timestamp || timestamp <= 0) {
    return fallback;
  }

  return new Date(timestamp * 1000).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
}

export function calculatePendingAssignmentsCount(
  assignments: Array<{ graded?: boolean; grade?: string | null; submissionStatus?: string }>,
): number {
  return assignments.filter((assignment) => {
    const isGraded = assignment.graded || Boolean(assignment.grade);
    const isSubmitted = assignment.submissionStatus === 'submitted';

    return !isGraded && !isSubmitted;
  }).length;
}
