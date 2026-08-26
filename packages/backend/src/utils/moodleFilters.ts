/**
 * Normalizes text by removing HTML tags, decoding entities, and collapsing whitespace.
 */
export function normalizeMoodleText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#039;/g, "'") // Replace &#039; with '
    .replace(/\s+/g, ' ') // Collapse multiple whitespaces
    .trim();
}

export interface Course {
  fullname: string;
  shortname?: string;
  progress?: number | null;
  // allow other fields when present
  [key: string]: any;
}

export type CourseStatus =
  'completed' | 'not_completed' | 'in_progress' | 'not_started';

export interface CourseFilters {
  status?: CourseStatus;
  year?: string | number;
  semester?: string | number;
}

/**
 * Checks if a string matches year and semester filters.
 * Works with full academic year (e.g. "2025/2026"), single years ("2025"), short years ("25"), separators like _, -, /, . and spaces.
 */
export function matchesYearAndSemester(
  text?: string | null,
  year?: string | number,
  semester?: string | number,
): boolean {
  const target = (text || '').toLowerCase();

  if (year) {
    const rawYear = String(year).trim().replace('-', '/');
    if (rawYear.includes('/')) {
      const [y1, y2] = rawYear.split('/');
      const pattern = new RegExp(
        `(?:^|[\\s\\-_/.])(?:${y1}|${y1.slice(-2)})[/-](?:${y2}|${y2.slice(-2)})(?=[\\s\\-_/.]|$)`,
        'i',
      );
      if (!pattern.test(target)) return false;
    } else {
      const fullYear = rawYear;
      const shortYear = fullYear.slice(-2);
      const yearPattern = new RegExp(
        `(?:^|[\\s\\-_/.])(?:${fullYear}|${shortYear})(?=[\\s\\-_/.]|$)`,
        'i',
      );
      if (!yearPattern.test(target)) return false;
    }
  }

  if (semester) {
    const sem = String(semester);
    // Ищем цифру семестра, окруженную разделителями или словами sem/сем
    const semesterPattern = new RegExp(
      `(?:^|[\\s\\-_/.])(?:${sem})(?:\\s*(?:sem|сем|семестр|semester)|[\\s\\-_/.]|$)`,
      'i',
    );
    if (!semesterPattern.test(target)) return false;
  }

  return true;
}

/**
 * Extracts academic year in canonical "YYYY/YYYY" format (e.g. "2025/2026").
 * Supports formats like "2025/2026", "2025-2026", "2025/26", "2025-26", "2025",
 * and falls back to Moodle course startdate timestamp if year is not present in name.
 */
export function extractAcademicYear(
  name?: string | null,
  startdate?: number | null,
): string | null {
  const text = name || '';

  // 1. Повний формат: "2025/2026" або "2025-2026"
  const fullPairMatch = text.match(/(20\d{2})[/-](20\d{2})/);
  if (fullPairMatch) {
    return `${fullPairMatch[1]}/${fullPairMatch[2]}`;
  }

  // 2. Скорочений формат пари: "2025/26" або "2025-26"
  const shortPairMatch = text.match(/(20(\d{2}))[/-](\d{2})/);
  if (shortPairMatch) {
    const startYear = parseInt(shortPairMatch[1], 10);
    const endSuffix = parseInt(shortPairMatch[3], 10);
    const century = startYear - (startYear % 100);
    return `${startYear}/${century + endSuffix}`;
  }

  // 3. Одиночний 4-значний рік: "2025"
  const singleYearMatch = text.match(/(?:^|[\s\-_/.])(20\d{2})(?:[\s\-_/.]|$)/);
  if (singleYearMatch) {
    const y = parseInt(singleYearMatch[1], 10);
    return `${y}/${y + 1}`;
  }

  // 4. Fallback: визначення за датою старту курсу в Moodle
  if (startdate && startdate > 0) {
    const date = new Date(startdate * 1000);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // 1 - 12
    return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  }

  return null;
}

/**
 * Extracts year (legacy helper, returns first 4-digit year as number)
 */
export function extractYear(name: string): number | null {
  const match = name.match(/20\d{2}/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Extracts semester (helper)
 */
export function extractSemester(name: string): number | null {
  const match = name.match(
    /(?:^|[\s\-_/])([12])(?:\s*(?:sem|сем|семестр|semester)|[\s\-_/]|$)/i,
  );
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Filters courses by provided filters.
 */
export function filterCourses(
  courses: Course[],
  filters: CourseFilters,
): Course[] {
  return courses.filter((course) => {
    const combinedName =
      `${course.fullname || ''} ${course.shortname || ''}`.trim();

    if (!matchesYearAndSemester(combinedName, filters.year, filters.semester)) {
      return false;
    }

    if (filters.status) {
      const p = course.progress;
      const numeric = typeof p === 'number' ? p : 0;
      const progress = numeric > 1 ? numeric : numeric * 100;

      switch (filters.status) {
        case 'completed':
          if (progress < 100) return false;
          break;
        case 'not_completed':
          if (progress >= 100) return false;
          break;
        case 'in_progress':
          if (progress <= 0 || progress >= 100) return false;
          break;
        case 'not_started':
          if (progress > 0) return false;
          break;
      }
    }

    return true;
  });
}
