import type { Grade } from '@uni-hub/types';
import type { BadgeId } from '@uni-hub/constants/gamification';
import { SEMESTER_MASTER_THRESHOLD } from '@uni-hub/constants/gamification';
import { getGradeRawValue, getValidGrades } from './grades';

/** Local calendar day as YYYY-MM-DD */
export function toLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);

  targetDate.setDate(targetDate.getDate() + days);

  return toLocalDateKey(targetDate);
}

export function isSemesterMaster(grades: Grade[]): boolean {
  const valid = getValidGrades(grades);

  if (valid.length === 0) {
    return false;
  }

  return valid.every((grade) => {
    const score = getGradeRawValue(grade) ?? Number.parseFloat(grade.grade);

    return Number.isFinite(score) && score >= SEMESTER_MASTER_THRESHOLD;
  });
}

export function evaluateBadgeUnlocks(input: {
  checkedInAtNight: boolean;
  grades: Grade[];
  unlocked: BadgeId[];
  submittedBeforeDeadline?: boolean;
}): BadgeId[] {
  const next: BadgeId[] = [];
  const hasBadge = (id: BadgeId) => input.unlocked.includes(id) || next.includes(id);

  if (!hasBadge('NIGHT_OWL') && input.checkedInAtNight) {
    next.push('NIGHT_OWL');
  }

  if (!hasBadge('SEMESTER_MASTER') && isSemesterMaster(input.grades)) {
    next.push('SEMESTER_MASTER');
  }

  if (!hasBadge('DEADLINE_SNIPER') && input.submittedBeforeDeadline) {
    next.push('DEADLINE_SNIPER');
  }

  return next;
}
