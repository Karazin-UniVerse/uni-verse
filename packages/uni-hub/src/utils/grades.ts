import type { Grade } from '../types';

export function getGradeCourseName(g: Grade): string {
  return g.courseName || g.course_name || '';
}

export function getGradeRawValue(g: Grade): number | null {
  if (g.rawGrade !== undefined && g.rawGrade !== null) {
    const parsed =
      typeof g.rawGrade === 'number' ? g.rawGrade : Number.parseFloat(String(g.rawGrade));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (g.rawgrade !== undefined && g.rawgrade !== null) {
    const parsed =
      typeof g.rawgrade === 'number' ? g.rawgrade : Number.parseFloat(String(g.rawgrade));
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number.parseFloat(String(g.grade || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function getValidGrades(grades: Grade[]): Grade[] {
  if (!Array.isArray(grades)) return [];
  return grades.filter((g) => {
    const raw = getGradeRawValue(g);
    const isZero = g.grade === '0' || g.grade === '0.00' || raw === 0;
    const isEmpty = !g.grade || g.grade === '-';
    return !isZero && !isEmpty;
  });
}

export function getGradeTone(rawgrade: number | null): 'success' | 'warning' | 'danger' {
  if (rawgrade === null || rawgrade === undefined) return 'warning';
  if (rawgrade >= 80) return 'success';
  if (rawgrade >= 50) return 'warning';
  return 'danger';
}

export function getGradeBarColor(rawgrade: number | null): string {
  if (rawgrade === null || rawgrade === undefined) return 'var(--chart-warning)';
  if (rawgrade >= 80) return 'var(--chart-success)';
  if (rawgrade >= 50) return 'var(--chart-warning)';
  return 'var(--chart-danger)';
}
