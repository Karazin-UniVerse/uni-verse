import { CONTROL_TYPES, TRADITIONAL_GRADES } from '@core/constants/grades';
import type { ControlType } from '@core/utils/grades';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { getGradeRawValue } from '@uni-hub/utils/grades';
import { NAV_KEYS, STUDY_VIEWS, type NavKey, type StudyView } from './constants';

const CONTROL_TYPE_KEYS: Record<ControlType, TranslationKey> = {
  [CONTROL_TYPES.EXAM]: 'control.exam',
  [CONTROL_TYPES.CREDIT]: 'control.credit',
  [CONTROL_TYPES.DIFFERENTIATED_CREDIT]: 'control.diffCredit',
};

export function getControlTypeLabel(
  controlType: ControlType,
  formatMessage: (key: TranslationKey) => string,
): string {
  const key = CONTROL_TYPE_KEYS[controlType] ?? 'control.exam';

  return formatMessage(key);
}

const TRADITIONAL_GRADE_KEYS: Record<string, TranslationKey> = {
  [TRADITIONAL_GRADES.EXCELLENT]: 'grades.excellent',
  [TRADITIONAL_GRADES.GOOD]: 'grades.good',
  [TRADITIONAL_GRADES.SATISFACTORY]: 'grades.satisfactory',
  [TRADITIONAL_GRADES.UNSATISFACTORY]: 'grades.unsatisfactory',
  [TRADITIONAL_GRADES.PASSED]: 'grades.passed',
  [TRADITIONAL_GRADES.FAILED]: 'grades.failed',
};

export function getTraditionalGradeLabel(
  grade: string,
  formatMessage?: (key: TranslationKey) => string,
): string {
  const translationKey = TRADITIONAL_GRADE_KEYS[grade];

  if (translationKey && formatMessage) {
    return formatMessage(translationKey);
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
  if (typeof gradeItem === 'number' && !Number.isNaN(gradeItem)) {
    return Math.min(100, Math.max(0, Math.round(gradeItem)));
  }

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

const NAV_KEYS_SET: ReadonlySet<string> = new Set(NAV_KEYS);

export const isNavKey = (value: string): value is NavKey => NAV_KEYS_SET.has(value);

const STUDY_VIEWS_SET: ReadonlySet<string> = new Set(STUDY_VIEWS);

export const isStudyView = (value: string): value is StudyView => STUDY_VIEWS_SET.has(value);
