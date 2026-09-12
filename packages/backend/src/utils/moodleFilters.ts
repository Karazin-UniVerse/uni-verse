const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
};

function stripHtmlTags(input: string): string {
  return input.replace(/<\/?(?:[a-zA-Z][^>]*|!--[\s\S]*?--|![^>]*)>/g, ' ');
}

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
    cleaned = stripHtmlTags(cleaned);
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
  return str.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function matchesYear(target: string, year: string | number): boolean {
  const rawYear = String(year).trim().replace('-', '/');

  // Only accept numeric years and formats like 2025 or 2025/2026
  if (!/^(\d{2,4})(\/\d{2,4})?$/.test(rawYear)) {
    return false;
  }

  if (rawYear.includes('/')) {
    const [firstYear, secondYear] = rawYear.split('/');
    const escapedFirstYear = escapeRegex(firstYear);
    const escapedFirstYearShort = escapeRegex(firstYear.slice(-2));
    const escapedSecondYear = escapeRegex(secondYear);
    const escapedSecondYearShort = escapeRegex(secondYear.slice(-2));
    const pattern = new RegExp(
      String.raw`(?:^|[\s\-_/.])(?:${escapedFirstYear}|${escapedFirstYearShort})[/-](?:${escapedSecondYear}|${escapedSecondYearShort})(?=[\s\-_/.]|$)`,
      'i',
    );

    return pattern.test(target);
  }

  const fullYear = escapeRegex(rawYear);
  const shortYear = escapeRegex(rawYear.slice(-2));
  const yearPattern = new RegExp(
    String.raw`(?:^|[\s\-_/.])(?:${fullYear}|${shortYear})(?=[\s\-_/.]|$)`,
    'i',
  );

  return yearPattern.test(target);
}

function matchesSemester(target: string, semester: string | number): boolean {
  const semesterText = String(semester).trim();

  if (!/^[1-9]\d*$/.test(semesterText)) {
    return false;
  }

  const escapedSemester = escapeRegex(semesterText);
  const semesterPattern = new RegExp(
    String.raw`(?:^|[\s\-_/.])(?:${escapedSemester})(?:\s*(?:sem|сем|семестр|semester)|[\s\-_/.]|$)`,
    'i',
  );

  return semesterPattern.test(target);
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

  if (
    year !== undefined &&
    year !== null &&
    String(year).trim() !== '' &&
    !matchesYear(target, year)
  ) {
    return false;
  }

  if (
    semester !== undefined &&
    semester !== null &&
    String(semester).trim() !== '' &&
    !matchesSemester(target, semester)
  ) {
    return false;
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
  const fullPairMatch = /(20\d{2})[/-](20\d{2})/.exec(text);

  if (fullPairMatch) {
    return `${fullPairMatch[1]}/${fullPairMatch[2]}`;
  }

  // 2. Скорочений формат пари: "2025/26" або "2025-26"
  const shortPairMatch = /(20(\d{2}))[/-](\d{2})/.exec(text);

  if (shortPairMatch) {
    const startYear = Number.parseInt(shortPairMatch[1], 10);
    const endSuffix = Number.parseInt(shortPairMatch[3], 10);
    const century = startYear - (startYear % 100);

    return `${startYear}/${century + endSuffix}`;
  }

  // 3. Одиночний 4-значний рік: "2025"
  const singleYearMatch = /(?:^|[\s\-_/.])(20\d{2})(?:[\s\-_/.]|$)/.exec(text);

  if (singleYearMatch) {
    const yearNumber = Number.parseInt(singleYearMatch[1], 10);

    return `${yearNumber}/${yearNumber + 1}`;
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
  const match = /20\d{2}/.exec(name);

  return match ? Number.parseInt(match[0], 10) : null;
}

/**
 * Extracts semester (helper)
 */
export function extractSemester(name: string): number | null {
  const match =
    /(?:^|[\s\-_/])([12])(?:\s*(?:sem|сем|семестр|semester)|[\s\-_/]|$)/i.exec(
      name,
    );

  return match ? Number.parseInt(match[1], 10) : null;
}

function matchesCourseStatus(
  progressValue: Course['progress'],
  status?: CourseFilters['status'],
): boolean {
  if (!status) {
    return true;
  }

  const numeric = typeof progressValue === 'number' ? progressValue : 0;
  const progress = numeric > 1 ? numeric : numeric * 100;

  switch (status) {
    case 'completed':
      return progress >= 100;
    case 'not_completed':
      return progress < 100;
    case 'in_progress':
      return progress > 0 && progress < 100;
    case 'not_started':
      return progress <= 0;
    default:
      return true;
  }
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

    return matchesCourseStatus(course.progress, filters.status);
  });
}
