import {
  normalizeMoodleText,
  matchesYearAndSemester,
  extractAcademicYear,
  extractYear,
  extractSemester,
  filterCourses,
} from './moodleFilters';

describe('moodleFilters', () => {
  describe('normalizeMoodleText', () => {
    it('should strip standard HTML tags and collapse whitespace', () => {
      const input =
        '<p>Hello   <strong>World</strong></p>&nbsp;<span>Test</span>';

      expect(normalizeMoodleText(input)).toBe('Hello World Test');
    });

    it('should strip script tags and other HTML elements', () => {
      const malicious = '<script>alert("xss")</script><p>Clean content</p>';
      const result = normalizeMoodleText(malicious);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).toBe('alert("xss") Clean content');
    });

    it('should prevent double-unescaping', () => {
      const doubleEscaped = '&amp;quot;';

      // &amp; is decoded to &, but the resulting &quot; must NOT be decoded to "
      expect(normalizeMoodleText(doubleEscaped)).toBe('&quot;');
    });

    it('should return empty string for null or empty input', () => {
      expect(normalizeMoodleText(null)).toBe('');
      expect(normalizeMoodleText(undefined)).toBe('');
      expect(normalizeMoodleText('')).toBe('');
    });

    it('should preserve comparison expressions and incomplete markup', () => {
      expect(normalizeMoodleText('Score < 50')).toBe('Score < 50');
      expect(normalizeMoodleText('Score < 50 and rating > 10')).toBe(
        'Score < 50 and rating > 10',
      );
      expect(normalizeMoodleText('<incomplete tag without closing')).toBe(
        '<incomplete tag without closing',
      );
    });
  });

  describe('matchesYearAndSemester', () => {
    it('should match valid years and semesters', () => {
      expect(
        matchesYearAndSemester('Course 2025/2026 1 sem', '2025/2026', 1),
      ).toBe(true);
      expect(
        matchesYearAndSemester('Course 2025/2026 2 sem', '2025/2026', 1),
      ).toBe(false);
    });

    it('should match single 4-digit and 2-digit years', () => {
      expect(matchesYearAndSemester('Course 2025', '2025')).toBe(true);
      expect(matchesYearAndSemester('Course 2025', 2025)).toBe(true);
      expect(matchesYearAndSemester('Course 2024', '2025')).toBe(false);
    });

    it('should handle undefined, null, or empty year and semester', () => {
      expect(matchesYearAndSemester('Any Course', undefined, undefined)).toBe(
        true,
      );
      expect(
        matchesYearAndSemester('Any Course', null as any, null as any),
      ).toBe(true);
      expect(matchesYearAndSemester('Any Course', '', '')).toBe(true);
      expect(matchesYearAndSemester('', 2025, 1)).toBe(false);
      expect(matchesYearAndSemester(undefined as any, 2025, 1)).toBe(false);
    });

    it('should safely handle malicious or invalid regex inputs without throwing', () => {
      expect(() => matchesYearAndSemester('Course', '(', '(')).not.toThrow();
      expect(matchesYearAndSemester('Course', '(', '(')).toBe(false);
      expect(matchesYearAndSemester('Course', '2025', '*')).toBe(false);
      expect(matchesYearAndSemester('Course', 'invalid-year', 1)).toBe(false);
      expect(matchesYearAndSemester('Course 2025', '2025', 'invalid-sem')).toBe(
        false,
      );
    });
  });

  describe('extractYear', () => {
    it('should extract 4-digit year or return null', () => {
      expect(extractYear('CS 2025 Course')).toBe(2025);
      expect(extractYear('Course without year')).toBeNull();
    });
  });

  describe('extractSemester', () => {
    it('should extract semester 1 or 2 or return null', () => {
      expect(extractSemester('Course 1 sem')).toBe(1);
      expect(extractSemester('Course 2 semester')).toBe(2);
      expect(extractSemester('Course 1 сем')).toBe(1);
      expect(extractSemester('Course 2 семестр')).toBe(2);
      expect(extractSemester('Course without semester')).toBeNull();
    });
  });

  describe('extractAcademicYear', () => {
    it('should extract canonical year format from name', () => {
      expect(extractAcademicYear('Algorithms 2025/2026')).toBe('2025/2026');
      expect(extractAcademicYear('Databases 2025-2026')).toBe('2025/2026');
      expect(extractAcademicYear('Math 2025/26')).toBe('2025/2026');
      expect(extractAcademicYear('OS 2025')).toBe('2025/2026');
    });

    it('should fallback to startdate timestamp if year is absent', () => {
      // 1725148800 = September 1, 2024 (autumn semester)
      expect(extractAcademicYear('Course without year', 1725148800)).toBe(
        '2024/2025',
      );
      // 1707955200 = February 15, 2024 (spring semester of 2023/2024)
      expect(extractAcademicYear('Course without year', 1707955200)).toBe(
        '2023/2024',
      );
    });

    it('should return null if no year in text and no startdate', () => {
      expect(extractAcademicYear('Course without year')).toBeNull();
      expect(extractAcademicYear('')).toBeNull();
      expect(extractAcademicYear(null as any)).toBeNull();
    });
  });

  describe('filterCourses', () => {
    it('should filter courses by progress status', () => {
      const courses = [
        { fullname: 'Course 1', progress: 100 },
        { fullname: 'Course 2', progress: 50 },
        { fullname: 'Course 3', progress: 0 },
        { fullname: 'Course 4', progress: 0.75 },
        { fullname: 'Course 5', progress: null },
      ];

      expect(filterCourses(courses, { status: 'completed' })).toHaveLength(1);
      expect(filterCourses(courses, { status: 'not_completed' })).toHaveLength(
        4,
      );
      expect(filterCourses(courses, { status: 'in_progress' })).toHaveLength(2);
      expect(filterCourses(courses, { status: 'not_started' })).toHaveLength(2);
      expect(filterCourses(courses, { status: 'other' as any })).toHaveLength(
        5,
      );
      expect(filterCourses(courses, {})).toHaveLength(5);
    });

    it('should filter courses by year, semester, and name combinations', () => {
      const courses = [
        {
          fullname: 'Algorithms 2025/2026 1 sem',
          shortname: 'ALG',
          progress: 80,
        },
        { fullname: '', shortname: 'DB 2025 2 sem', progress: 100 },
        { fullname: 'Physics 2024 1 sem', progress: 40 },
      ];

      expect(
        filterCourses(courses, { year: '2025/2026', semester: 1 }),
      ).toHaveLength(1);
      expect(
        filterCourses(courses, { year: '2025', semester: 2 }),
      ).toHaveLength(1);
      expect(filterCourses(courses, { year: '2023' })).toHaveLength(0);
    });
  });
});
