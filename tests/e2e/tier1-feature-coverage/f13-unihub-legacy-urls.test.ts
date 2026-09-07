import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 13: Fix Hardcoded Legacy URLs in UniHub (@universe/uni-hub)', () => {
  const modalPath = 'packages/uni-hub/src/components/AssignmentModal.tsx';

  it('F13-1: AssignmentModal.tsx must exist', () => {
    expect(fileExists(modalPath)).toBe(true);
  });

  it('F13-2: AssignmentModal.tsx should link to https://moodle.universemvp.tech', () => {
    const content = readWorkspaceFile(modalPath);

    expect(content).toContain('https://moodle.universemvp.tech');
  });

  it('F13-3: AssignmentModal.tsx must NOT contain legacy moodle.karazin.ua URL', () => {
    const content = readWorkspaceFile(modalPath);

    expect(content).not.toContain('moodle.karazin.ua');
  });

  it('F13-4: AssignmentModal external link should retain assignment instance parameter', () => {
    const content = readWorkspaceFile(modalPath);

    expect(content).toMatch(/mod\/assign\/view\.php\?a=\$\{module\.instance\}/);
  });

  it('F13-5: AssignmentModal external link should be secured with target="_blank" and rel="noopener noreferrer"', () => {
    const content = readWorkspaceFile(modalPath);

    expect(content).toMatch(/target="_blank"/);
    expect(content).toMatch(/rel="noopener noreferrer"/);
  });
});
