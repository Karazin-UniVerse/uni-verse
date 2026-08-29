import type { BadgeDefinition, BadgeId } from './types';
import type { Grade } from '../types';
import { getValidGrades, getGradeRawValue } from '../utils/grades';

export const BADGES: Record<BadgeId, BadgeDefinition> = {
  DEADLINE_SNIPER: {
    id: 'DEADLINE_SNIPER',
    title: 'Deadline Sniper',
    description: 'Сдали задание до дедлайна',
  },
  NIGHT_OWL: {
    id: 'NIGHT_OWL',
    title: 'Night Owl',
    description: 'Зашли в дашборд между 22:00 и 05:00',
  },
  SEMESTER_MASTER: {
    id: 'SEMESTER_MASTER',
    title: 'Semester Master',
    description: 'Все курсы с оценкой ≥ 80',
  },
};

export const SEMESTER_MASTER_THRESHOLD = 80;

/** Local calendar day as YYYY-MM-DD */
export function toLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toLocalDateKey(dt);
}

export function isSemesterMaster(grades: Grade[]): boolean {
  const valid = getValidGrades(grades);
  if (valid.length === 0) return false;
  return valid.every((g) => {
    const score = getGradeRawValue(g) ?? Number.parseFloat(g.grade);
    return Number.isFinite(score) && score >= SEMESTER_MASTER_THRESHOLD;
  });
}

export function evaluateBadgeUnlocks(input: {
  unlocked: BadgeId[];
  grades: Grade[];
  checkedInAtNight: boolean;
  submittedBeforeDeadline?: boolean;
}): BadgeId[] {
  const next: BadgeId[] = [];
  const has = (id: BadgeId) => input.unlocked.includes(id) || next.includes(id);

  if (!has('NIGHT_OWL') && input.checkedInAtNight) {
    next.push('NIGHT_OWL');
  }
  if (!has('SEMESTER_MASTER') && isSemesterMaster(input.grades)) {
    next.push('SEMESTER_MASTER');
  }
  if (!has('DEADLINE_SNIPER') && input.submittedBeforeDeadline) {
    next.push('DEADLINE_SNIPER');
  }

  return next;
}
