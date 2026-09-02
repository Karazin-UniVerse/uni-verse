import type { Grade } from '../types';

export function getGradeCourseName(grade: Grade): string {
  return grade.courseName || grade.course_name || '';
}

export function getGradeRawValue(grade: Grade): number | null {
  if (grade.rawGrade !== undefined && grade.rawGrade !== null) {
    const parsed =
      typeof grade.rawGrade === 'number'
        ? grade.rawGrade
        : Number.parseFloat(String(grade.rawGrade));

    return Number.isFinite(parsed) ? parsed : null;
  }

  if (grade.rawgrade !== undefined && grade.rawgrade !== null) {
    const parsed =
      typeof grade.rawgrade === 'number'
        ? grade.rawgrade
        : Number.parseFloat(String(grade.rawgrade));

    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number.parseFloat(String(grade.grade || ''));

  return Number.isFinite(parsed) ? parsed : null;
}

export function getValidGrades(grades: Grade[]): Grade[] {
  if (!Array.isArray(grades)) {
    return [];
  }

  return grades.filter((grade) => {
    const raw = getGradeRawValue(grade);
    const isZero = grade.grade === '0' || grade.grade === '0.00' || raw === 0;
    const isEmpty = !grade.grade || grade.grade === '-';

    return !isZero && !isEmpty;
  });
}

export function getGradeTone(rawgrade: number | null): 'success' | 'warning' | 'danger' {
  if (rawgrade === null || rawgrade === undefined) {
    return 'warning';
  }

  if (rawgrade >= 80) {
    return 'success';
  }

  if (rawgrade >= 50) {
    return 'warning';
  }

  return 'danger';
}

export function getGradeBarColor(rawgrade: number | null): string {
  if (rawgrade === null || rawgrade === undefined) {
    return 'var(--chart-warning)';
  }

  if (rawgrade >= 80) {
    return 'var(--chart-success)';
  }

  if (rawgrade >= 50) {
    return 'var(--chart-warning)';
  }

  return 'var(--chart-danger)';
}
