export type AssignmentStatusInfo = {
  tone: 'success' | 'danger' | 'info' | 'warning';
  label: string;
};

export type AssignmentStatusInfoParams = {
  status: string;
  isGraded: boolean;
  isAwaitingReview: boolean;
  isOverdue?: boolean;
};

export function getAssignmentStatusInfo({
  status,
  isGraded,
  isAwaitingReview,
  isOverdue,
}: AssignmentStatusInfoParams): AssignmentStatusInfo {
  if (typeof isOverdue === 'boolean') {
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

  if (isGraded) {
    return {
      tone: 'success',
      label: status === 'graded' ? 'Оцінено' : 'Здано на перевірку',
    };
  }

  if (isAwaitingReview) {
    return { tone: 'danger', label: 'Прострочено' };
  }

  return { tone: 'info', label: 'В процесі' };
}

export function formatLastSync(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
