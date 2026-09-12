import type { Grade } from '../types';

export function getGradeCourseName(grade: Grade): string {
  const courseName = grade.courseName?.trim();
  const fallbackCourseName = grade.course_name?.trim();

  return courseName || fallbackCourseName || '';
}

function parseCandidateValue(candidate: unknown): number | null {
  if (candidate === undefined || candidate === null || candidate === '') {
    return null;
  }

  if (typeof candidate === 'number') {
    return Number.isFinite(candidate) ? candidate : null;
  }

  const trimmed = String(candidate).trim();

  if (trimmed === '') {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

export function getGradeRawValue(grade: Grade): number | null {
  const candidateValues = [grade.rawGrade, grade.rawgrade, grade.grade];

  for (const candidate of candidateValues) {
    const parsed = parseCandidateValue(candidate);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

export function getValidGrades(grades: Grade[]): Grade[] {
  if (!Array.isArray(grades)) {
    return [];
  }

  return grades.filter((grade) => {
    const rawValue = getGradeRawValue(grade);

    if (rawValue === null) {
      return false;
    }

    const isZero = grade.grade === '0' || grade.grade === '0.00' || rawValue === 0;
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
