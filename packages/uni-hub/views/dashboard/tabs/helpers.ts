import type { MoodleEvent } from '@uni-hub/types';

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
