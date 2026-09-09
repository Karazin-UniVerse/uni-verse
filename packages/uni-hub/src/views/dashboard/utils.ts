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

export function parseGradeScore(gradeItem: any): number {
  const rawVal = getGradeRawValue(gradeItem);

  if (rawVal !== null && rawVal !== undefined) {
    const parsed = Number(rawVal);

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
