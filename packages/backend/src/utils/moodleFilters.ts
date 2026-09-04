const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
};

/**
 * Normalizes text by iteratively removing HTML tags, decoding entities in a single pass, and collapsing whitespace.
 */
export function normalizeMoodleText(text?: string | null): string {
  if (!text) return '';

  let cleaned = text;
  let prev = '';

  // Iteratively strip HTML tags to prevent incomplete sanitization (e.g. nested tags)
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  }

  // Single-pass replacement prevents double-unescaping vulnerabilities
  cleaned = cleaned.replace(
    /&(?:nbsp|quot|#039|apos|lt|gt|amp);/gi,
    (match) => HTML_ENTITIES[match.toLowerCase()] ?? match,
  );

  return cleaned.replace(/\s+/g, ' ').trim();
}

export interface Course {
  fullname: string;
  shortname?: string;
  progress?: number | null;
  [key: string]: unknown;
}

export type CourseStatus =
  'completed' | 'not_completed' | 'in_progress' | 'not_started';

export interface CourseFilters {
  status?: CourseStatus;
  year?: string | number;
  semester?: string | number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  if (year !== undefined && year !== null && String(year).trim() !== '') {
    const rawYear = String(year).trim().replace('-', '/');

    // Only accept numeric years and formats like 2025 or 2025/2026
    if (!/^(\d{2,4})(\/\d{2,4})?$/.test(rawYear)) {
      return false;
    }

    if (rawYear.includes('/')) {
      const [y1, y2] = rawYear.split('/');
      const escY1 = escapeRegex(y1);
      const escY1Short = escapeRegex(y1.slice(-2));
      const escY2 = escapeRegex(y2);
      const escY2Short = escapeRegex(y2.slice(-2));
      const pattern = new RegExp(
        `(?:^|[\\s\\-_/.])(?:${escY1}|${escY1Short})[/-](?:${escY2}|${escY2Short})(?=[\\s\\-_/.]|$)`,
        'i',
      );

      if (!pattern.test(target)) return false;
    } else {
      const fullYear = escapeRegex(rawYear);
      const shortYear = escapeRegex(rawYear.slice(-2));
      const yearPattern = new RegExp(
        `(?:^|[\\s\\-_/.])(?:${fullYear}|${shortYear})(?=[\\s\\-_/.]|$)`,
        'i',
      );

      if (!yearPattern.test(target)) return false;
    }
  }

  if (
    semester !== undefined &&
    semester !== null &&
    String(semester).trim() !== ''
  ) {
    const semStr = String(semester).trim();

    if (!/^[1-9]\d*$/.test(semStr)) {
      return false;
    }

    const escSem = escapeRegex(semStr);
    const semesterPattern = new RegExp(
      `(?:^|[\\s\\-_/.])(?:${escSem})(?:\\s*(?:sem|сем|семестр|semester)|[\\s\\-_/.]|$)`,
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
    const month = date.getUTCMonth() + 1;

    // 1 - 12
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
