export type AssignmentStatusInfo = {
  tone: 'success' | 'danger' | 'info';
  label: string;
};

export function getAssignmentStatusInfo(
  status: string,
  isCompleted: boolean,
  isOverdue: boolean,
): AssignmentStatusInfo {
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
