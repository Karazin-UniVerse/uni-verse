import {
  normalizeMoodleText,
  matchesYearAndSemester,
  extractAcademicYear,
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

    it('should safely handle malicious or invalid regex inputs without throwing', () => {
      expect(() => matchesYearAndSemester('Course', '(', '(')).not.toThrow();
      expect(matchesYearAndSemester('Course', '(', '(')).toBe(false);
      expect(matchesYearAndSemester('Course', '2025', '*')).toBe(false);
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
      // 1725148800 = September 1, 2024
      expect(extractAcademicYear('Course without year', 1725148800)).toBe(
        '2024/2025',
      );
    });
  });

  describe('filterCourses', () => {
    it('should filter courses by progress status', () => {
      const courses = [
        { fullname: 'Course 1', progress: 100 },
        { fullname: 'Course 2', progress: 50 },
        { fullname: 'Course 3', progress: 0 },
      ];

      expect(filterCourses(courses, { status: 'completed' })).toHaveLength(1);
      expect(filterCourses(courses, { status: 'in_progress' })).toHaveLength(1);
      expect(filterCourses(courses, { status: 'not_started' })).toHaveLength(1);
    });
  });
});
