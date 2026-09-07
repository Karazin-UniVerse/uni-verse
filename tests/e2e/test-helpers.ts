import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const WORKSPACE_ROOT = path.resolve(__dirname, '../..');

export function resolveWorkspacePath(...segments: string[]): string {
  return path.resolve(WORKSPACE_ROOT, ...segments);
}

export function fileExists(relPath: string): boolean {
  return fs.existsSync(resolveWorkspacePath(relPath));
}

export function readWorkspaceFile(relPath: string): string {
  const fullPath = resolveWorkspacePath(relPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Workspace file not found: ${relPath} (resolved: ${fullPath})`);
  }

  return fs.readFileSync(fullPath, 'utf8');
}

export function readJsonFile<T = unknown>(relPath: string): T {
  return JSON.parse(readWorkspaceFile(relPath));
}

/**
 * Authoritative Oracles derived strictly from PROJECT.md and ORIGINAL_REQUEST.md
 */
export function oracleCalculateEctsGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'Fx' | 'F' {
  if (score >= 90) return 'A';

  if (score >= 82) return 'B';

  if (score >= 74) return 'C';

  if (score >= 64) return 'D';

  if (score >= 60) return 'E';

  if (score >= 35) return 'Fx';

  return 'F';
}

export function oracleCalculateTraditionalGrade(
  score: number,
  controlType: 'exam' | 'credit' | 'differentiated_credit' = 'exam',
): 'відмінно' | 'добре' | 'задовільно' | 'незадовільно' | 'зараховано' | 'не зараховано' {
  if (controlType === 'credit') {
    return score >= 60 ? 'зараховано' : 'не зараховано';
  }

  if (score >= 90) return 'відмінно';

  if (score >= 74) return 'добре';

  if (score >= 60) return 'задовільно';

  return 'незадовільно';
}

/**
 * Dynamic module loader for @universe/types
 */
export async function loadTypesModule(): Promise<any> {
  const tsPath = resolveWorkspacePath('packages/types/src/index.ts');

  if (!fs.existsSync(tsPath)) {
    return null;
  }

  try {
    return await import('../../packages/types/src/index.ts');
  } catch {
    return null;
  }
}

/**
 * Dynamic module loader for @universe/ui
 */
export async function loadUiModule(): Promise<any> {
  const tsPath = resolveWorkspacePath('packages/ui/index.ts');

  if (!fs.existsSync(tsPath)) {
    return null;
  }

  try {
    return await import('../../packages/ui/index.ts');
  } catch {
    return null;
  }
}

/**
 * Standard test fixtures based on PROJECT.md interfaces
 */
export const mockStudentProfile = {
  id: 'karazin-student-001',
  moodleId: 4021,
  fullName: 'Барсуков Родіон Сергійович',
  email: 'rodion.barsukov@karazin.ua',
  avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/4021/f1.jpg',
  studentCardNumber: 'KB-10293847',
  recordBookNumber: 'ЗК-2024-042',
  faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
  department: 'Кафедра математичного моделювання та аналізу даних',
  specialty: '122 Компʼютерні науки',
  educationalProgram: 'Компʼютерні науки та інтелектуальні системи',
  degree: 'bachelor' as const,
  course: 3,
  group: 'КС12',
  studyForm: 'full-time' as const,
  financing: 'budget' as const,
  status: 'active' as const,
  gpa: 92.4,
  totalCreditsEarned: 120,
  academicStanding: 'honors' as const,
};

export const mockCurriculumItems = [
  {
    id: 101,
    code: 'CS301',
    name: 'Паралельні та розподілені обчислення',
    shortName: 'ПРО',
    credits: 5,
    semester: 5,
    academicYear: '2026/2027',
    cycle: 'professional' as const,
    controlType: 'exam' as const,
    instructors: [{ name: 'Проф. Коваленко О. І.', email: 'kovalenko@karazin.ua' }],
    status: 'in_progress' as const,
    progress: 75,
    moodleCourseId: 301,
    moodleUrl: 'https://moodle.universemvp.tech/course/view.php?id=301',
  },
  {
    id: 102,
    code: 'CS302',
    name: 'Інтелектуальний аналіз даних',
    shortName: 'ІАД',
    credits: 4,
    semester: 5,
    academicYear: '2026/2027',
    cycle: 'professional' as const,
    controlType: 'credit' as const,
    instructors: [{ name: 'Доц. Сидоренко В. М.', email: 'sydorenko@karazin.ua' }],
    status: 'in_progress' as const,
    progress: 60,
    moodleCourseId: 302,
    moodleUrl: 'https://moodle.universemvp.tech/course/view.php?id=302',
  },
];

export const mockGradeRecords = [
  {
    id: 'grade-01',
    courseId: 101,
    courseName: 'Паралельні та розподілені обчислення',
    courseCode: 'CS301',
    credits: 5,
    semester: 5,
    academicYear: '2026/2027',
    controlType: 'exam' as const,
    currentScore: 54,
    examScore: 38,
    totalScore: 92,
    ectsGrade: 'A' as const,
    traditionalGrade: 'відмінно' as const,
    date: '2026-06-15',
    instructorName: 'Проф. Коваленко О. І.',
    isPassed: true,
  },
  {
    id: 'grade-02',
    courseId: 102,
    courseName: 'Інтелектуальний аналіз даних',
    courseCode: 'CS302',
    credits: 4,
    semester: 5,
    academicYear: '2026/2027',
    controlType: 'credit' as const,
    currentScore: 68,
    examScore: null,
    totalScore: 68,
    ectsGrade: 'D' as const,
    traditionalGrade: 'зараховано' as const,
    date: '2026-06-10',
    instructorName: 'Доц. Сидоренко В. М.',
    isPassed: true,
  },
];
