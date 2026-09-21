import type { ControlType } from '@core/types';
import { getGradeRawValue } from '@uni-hub/utils/grades';

export function getControlTypeLabel(controlType: ControlType): string {
  switch (controlType) {
    case 'exam':
      return 'Іспит';
    case 'credit':
      return 'Залік';
    case 'differentiated_credit':
      return 'Диф. залік';
    default:
      return 'Іспит';
  }
}

export function stripHtml(html?: string | null): string {
  if (!html) {
    return '';
  }

  let insideTag = false;
  let cleanText = '';

  for (const character of html) {
    if (character === '<') {
      insideTag = true;
    } else if (character === '>') {
      insideTag = false;
    } else if (!insideTag) {
      cleanText += character;
    }
  }

  return cleanText
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&#39;', "'")
    .trim();
}

export function parseGradeScore(gradeItem: unknown): number {
  const item = gradeItem as
    | (Parameters<typeof getGradeRawValue>[0] & {
        grade?: unknown;
        totalScore?: unknown;
      })
    | null
    | undefined;
  const rawValue = item ? getGradeRawValue(item) : null;

  if (rawValue !== null && rawValue !== undefined) {
    const parsed = Number(rawValue);

    return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
  }

  if (item && item.totalScore !== undefined && item.totalScore !== null) {
    const parsed = Number(item.totalScore);

    return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
  }

  const parsed = Number.parseFloat(String(item?.grade ?? ''));

  return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
}

export function getExamScoreDisplay(
  examScore: number | string | null | undefined,
  controlType?: ControlType,
): string {
  if (controlType === 'credit' || examScore === undefined || examScore === null) {
    return '—';
  }

  return String(examScore);
}
