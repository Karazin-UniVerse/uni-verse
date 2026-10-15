import type { TranslationKey } from '@uni-hub/i18n/translations';
import type { MoodleEvent } from '@core/types/moodle';

export type AssignmentStatusInfo = {
  tone: 'success' | 'danger' | 'info' | 'warning';
  labelKey: TranslationKey;
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
      return { tone: 'success', labelKey: 'assignments.status.graded' };
    }

    if (isAwaitingReview) {
      return { tone: 'warning', labelKey: 'assignments.status.awaitingReview' };
    }

    if (isOverdue) {
      return { tone: 'danger', labelKey: 'assignments.status.overdue' };
    }

    return { tone: 'info', labelKey: 'assignments.status.inProgress' };
  }

  if (isGraded) {
    return {
      tone: 'success',
      labelKey: status === 'graded' ? 'assignments.status.graded' : 'assignments.status.submitted',
    };
  }

  if (isAwaitingReview) {
    return { tone: 'danger', labelKey: 'assignments.status.overdue' };
  }

  return { tone: 'info', labelKey: 'assignments.status.inProgress' };
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
