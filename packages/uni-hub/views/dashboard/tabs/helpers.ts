export type AssignmentStatusInfo = {
  tone: 'success' | 'danger' | 'info' | 'warning';
  label: string;
};

export function getAssignmentStatusInfo(
  status: string,
  isGradedOrCompleted: boolean,
  isAwaitingOrOverdue: boolean,
  isOverdue?: boolean,
): AssignmentStatusInfo {
  if (typeof isOverdue === 'boolean') {
    const isGraded = isGradedOrCompleted;
    const isAwaitingReview = isAwaitingOrOverdue;

    if (isGraded) {
      return { tone: 'success', label: 'Оцінено' };
    }

    if (isAwaitingReview) {
      return { tone: 'warning', label: 'Очікує перевірки' };
    }

    if (isOverdue) {
      return { tone: 'danger', label: 'Прострочено' };
    }

    return { tone: 'info', label: 'В процесі' };
  }

  const isCompleted = isGradedOrCompleted;
  const overdue = isAwaitingOrOverdue;

  if (isCompleted) {
    return {
      tone: 'success',
      label: status === 'graded' ? 'Оцінено' : 'Здано на перевірку',
    };
  }

  if (overdue) {
    return { tone: 'danger', label: 'Прострочено' };
  }

  return { tone: 'info', label: 'В процесі' };
}
