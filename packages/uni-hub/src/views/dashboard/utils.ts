import type { ControlType } from '@core/types';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { getGradeRawValue } from '@uni-hub/utils/grades';

export function getControlTypeLabel(
  controlType: ControlType,
  t?: (key: TranslationKey) => string,
): string {
  if (t) {
    switch (controlType) {
      case 'exam':
        return t('control.exam');
      case 'credit':
        return t('control.credit');
      case 'differentiated_credit':
        return t('control.diffCredit');
      default:
        return t('control.exam');
    }
  }

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

export function getTraditionalGradeLabel(
  grade: string,
  t?: (key: TranslationKey) => string,
): string {
  if (t) {
    switch (grade) {
      case 'відмінно':
        return t('grades.excellent');
      case 'добре':
        return t('grades.good');
      case 'задовільно':
        return t('grades.satisfactory');
      case 'незадовільно':
        return t('grades.unsatisfactory');
      case 'зараховано':
        return t('grades.passed');
      case 'не зараховано':
        return t('grades.failed');
      default:
        return grade;
    }
  }

  return grade;
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

  if (item?.totalScore !== undefined && item?.totalScore !== null) {
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
