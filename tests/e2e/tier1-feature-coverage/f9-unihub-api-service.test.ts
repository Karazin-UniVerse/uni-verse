import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 9: UniHub API Service Alignment (@universe/uni-hub)', () => {
  const apiPath = 'packages/uni-hub/services/api.ts';
  const moodleApiPath = 'packages/uni-hub/services/api.moodle.ts';
  const requestPath = 'packages/uni-hub/services/api.request.ts';

  it('F9-1: packages/uni-hub/services/api.ts must exist', () => {
    expect(fileExists(apiPath)).toBe(true);
  });

  it('F9-2: the API barrel should expose the Moodle client and singleton', () => {
    const content = readWorkspaceFile(apiPath);

    expect(content).toContain("export { MoodleApi, moodleApi } from './api.moodle'");
  });

  it('F9-3: MoodleApi should declare the core course, grade, assignment and event methods', () => {
    const content = readWorkspaceFile(moodleApiPath);

    expect(content).toContain('getCourses(');
    expect(content).toContain('getGrades(');
    expect(content).toContain('getAssignments(');
    expect(content).toContain('getEvents(');
  });

  it('F9-4: api.ts endpoints should map to backend /moodle routes', () => {
    const content = readWorkspaceFile(moodleApiPath);

    expect(content).toContain('/moodle/courses');
    expect(content).toContain('/moodle/grades');
    expect(content).toContain('/moodle/assignments');
    expect(content).toContain('/moodle/events');
  });

  it('F9-5: api.request.ts should export the shared query-string builder', () => {
    const content = readWorkspaceFile(requestPath);

    expect(content).toContain('export function buildQueryString');
  });
});
