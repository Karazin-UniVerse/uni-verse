export type AssignmentStatusInfo = {
  tone: 'success' | 'danger' | 'info' | 'warning';
  label: string;
};

export function getAssignmentStatusInfo(
  status: string,
  isCompleted: boolean,
  isOverdue: boolean,
  isAwaitingReview?: boolean,
): AssignmentStatusInfo {
  if (isAwaitingReview) {
    return {
      tone: 'warning',
      label: 'Очікує перевірки',
    };
  }

  if (isCompleted) {
    return {
      tone: 'success',
      label: status === 'graded' ? 'Оцінено' : 'Здано на перевірку',
    };
  }

  if (isOverdue) {
    return { tone: 'danger', label: 'Прострочено' };
  }

  return { tone: 'info', label: 'В процесі' };
}
