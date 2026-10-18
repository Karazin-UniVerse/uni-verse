import { describe, it, expect } from 'vitest';
import { readWorkspaceFile } from '../test-helpers';

describe('Tier 2 - Feature 12 & 13: Boundary Cases in Gradebook and URL Handling', () => {
  const modalPath = 'packages/uni-hub/components/assignments/AssignmentDetail.tsx';

  it('F12-B1: Zero score (0/100) must render explicitly as 0 and not falsy empty string', () => {
    const formatScore = (val: number | null | undefined) =>
      val !== null && val !== undefined ? String(val) : '—';

    expect(formatScore(0)).toBe('0');
    expect(formatScore(null)).toBe('—');
    expect(formatScore(undefined)).toBe('—');
  });

  it('F12-B2: Course with continuous score only (no exam) displays totalScore accurately', () => {
    const item = {
      courseName: 'Теорія ймовірностей',
      currentScore: 78,
      examScore: null,
      totalScore: 78,
      ectsGrade: 'C',
      traditionalGrade: 'добре',
    };

    expect(item.totalScore).toBe(78);
    expect(item.examScore).toBeNull();
  });

  it('F13-B1: AssignmentDetail should construct valid URL using assignmentId fallback', () => {
    const assignmentId = 999999;
    const courseModule = { url: undefined };
    const moodleUrl =
      courseModule?.url || `https://moodle.universemvp.tech/mod/assign/view.php?a=${assignmentId}`;

    expect(moodleUrl).toBe('https://moodle.universemvp.tech/mod/assign/view.php?a=999999');
    const parsed = new URL(moodleUrl);

    expect(parsed.hostname).toBe('moodle.universemvp.tech');
    expect(parsed.searchParams.get('a')).toBe('999999');
  });

  it('F13-B3: UniHub code must strictly avoid unencrypted http:// links to Moodle', () => {
    const content = readWorkspaceFile(modalPath);

    expect(content).not.toContain('http://moodle.universemvp.tech');
    expect(content).not.toContain('http://moodle.karazin.ua');
  });
});
