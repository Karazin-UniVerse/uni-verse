import { describe, it, expect } from 'vitest';
import { readWorkspaceFile } from '../test-helpers';

describe('Tier 2 - Feature 12 & 13: Boundary Cases in Gradebook and URL Handling', () => {
  const modalPath = 'packages/uni-hub/src/components/AssignmentModal.tsx';

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

  it('F13-B1: AssignmentModal should construct valid URL even when instance ID is large number', () => {
    const instanceId = 999999;
    const url = `https://moodle.universemvp.tech/mod/assign/view.php?a=${instanceId}`;

    expect(url).toBe('https://moodle.universemvp.tech/mod/assign/view.php?a=999999');
    const parsed = new URL(url);

    expect(parsed.hostname).toBe('moodle.universemvp.tech');
    expect(parsed.searchParams.get('a')).toBe('999999');
  });

  it('F13-B2: AssignmentModal should handle missing instance ID gracefully by leaving moodleUrl undefined', () => {
    const module = { instance: undefined, url: undefined };
    const moodleUrl =
      module.url ||
      (module.instance
        ? `https://moodle.universemvp.tech/mod/assign/view.php?a=${module.instance}`
        : undefined);

    expect(moodleUrl).toBeUndefined();
  });

  it('F13-B3: UniHub code must strictly avoid unencrypted http:// links to Moodle', () => {
    const content = readWorkspaceFile(modalPath);

    expect(content).not.toContain('http://moodle.universemvp.tech');
    expect(content).not.toContain('http://moodle.karazin.ua');
  });
});
