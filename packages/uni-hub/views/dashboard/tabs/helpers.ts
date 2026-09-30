import type { MoodleEvent } from '@uni-hub/types';

export type AssignmentStatusInfo = {
  tone: 'success' | 'danger' | 'info' | 'warning';
  label: string;
};

export type AssignmentStatusInfoParams = {
  status: string;
  isGraded?: boolean;
  isAwaitingReview?: boolean;
  isOverdue?: boolean;
  isGradedOrCompleted?: boolean;
  isAwaitingOrOverdue?: boolean;
};

export function getAssignmentStatusInfo(
  paramsOrStatus: string | AssignmentStatusInfoParams,
  arg2?: boolean,
  arg3?: boolean,
  arg4?: boolean,
): AssignmentStatusInfo {
  let status: string;
  let isGradedOrCompleted: boolean;
  let isAwaitingOrOverdue: boolean;
  let isOverdue: boolean | undefined;

  if (typeof paramsOrStatus === 'object') {
    status = paramsOrStatus.status;
    isGradedOrCompleted = Boolean(paramsOrStatus.isGraded ?? paramsOrStatus.isGradedOrCompleted);
    isAwaitingOrOverdue = Boolean(
      paramsOrStatus.isAwaitingReview ?? paramsOrStatus.isAwaitingOrOverdue,
    );
    isOverdue = paramsOrStatus.isOverdue;
  } else {
    status = paramsOrStatus;
    isGradedOrCompleted = Boolean(arg2);
    isAwaitingOrOverdue = Boolean(arg3);
    isOverdue = arg4;
  }

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

export const MEETING_URL_REGEX =
  /https?:\/\/(?:[a-z0-9-]+\.)*(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|bbb\.[a-z0-9.-]+)[^\s"'<>()]*/i;

export const TRAILING_URL_PUNCTUATION = new Set([')', ']', ',', '.', ';', '!', '?']);

export const trimTrailingPunctuation = (url: string): string => {
  let end = url.length;

  while (end > 0 && TRAILING_URL_PUNCTUATION.has(url[end - 1] ?? '')) {
    end -= 1;
  }

  return url.slice(0, end);
};

export const extractMeetingUrl = (event: MoodleEvent): string | null => {
  if (event.url && MEETING_URL_REGEX.test(event.url)) {
    return event.url;
  }

  if (event.description) {
    const match = MEETING_URL_REGEX.exec(event.description);

    if (match) {
      return trimTrailingPunctuation(match[0]);
    }
  }

  return null;
};
