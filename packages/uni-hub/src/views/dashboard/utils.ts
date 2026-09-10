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

  for (let charIndex = 0; charIndex < html.length; charIndex += 1) {
    const character = html[charIndex];

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

export function parseGradeScore(gradeItem: any): number {
  const rawValue = getGradeRawValue(gradeItem);

  if (rawValue !== null && rawValue !== undefined) {
    const parsed = Number(rawValue);

    return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
  }

  if (gradeItem.totalScore !== undefined && gradeItem.totalScore !== null) {
    const parsed = Number(gradeItem.totalScore);

    return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
  }

  const parsed = Number.parseFloat(gradeItem.grade);

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
