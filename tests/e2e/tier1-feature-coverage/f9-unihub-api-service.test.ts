import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 9: UniHub API Service Alignment (@universe/uni-hub)', () => {
  const apiPath = 'packages/uni-hub/src/services/api.ts';

  it('F9-1: packages/uni-hub/src/services/api.ts must exist', () => {
    expect(fileExists(apiPath)).toBe(true);
  });

  it('F9-2: api.ts should export MoodleApi class and moodleApi singleton instance', () => {
    const content = readWorkspaceFile(apiPath);

    expect(content).toContain('class MoodleApi');
    expect(content).toMatch(/export\s+const\s+moodleApi\s*=\s*new\s+MoodleApi\(\)/);
  });

  it('F9-3: moodleApi should declare getCourses, getGrades, getAssignments, and getEvents', () => {
    const content = readWorkspaceFile(apiPath);

    expect(content).toContain('getCourses(');
    expect(content).toContain('getGrades(');
    expect(content).toContain('getAssignments(');
    expect(content).toContain('getEvents(');
  });

  it('F9-4: api.ts endpoints should map to backend /moodle routes', () => {
    const content = readWorkspaceFile(apiPath);

    expect(content).toContain('/moodle/courses');
    expect(content).toContain('/moodle/grades');
    expect(content).toContain('/moodle/assignments');
    expect(content).toContain('/moodle/events');
  });

  it('F9-5: api.ts should export buildQueryString helper function', () => {
    const content = readWorkspaceFile(apiPath);

    expect(content).toContain('function buildQueryString');
  });
});
