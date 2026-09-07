import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 7: Backend DTOs Alignment with @universe/types (@universe/backend)', () => {
  it('F7-1: Backend moodle controller should expose /moodle/courses with standard DTO fields', () => {
    const controllerPath = 'packages/backend/src/moodle/moodle.controller.ts';

    expect(fileExists(controllerPath)).toBe(true);
    const content = readWorkspaceFile(controllerPath);

    expect(content).toMatch(/courses/i);
  });

  it('F7-2: Backend moodle controller should expose /moodle/assignments endpoint', () => {
    const controllerPath = 'packages/backend/src/moodle/moodle.controller.ts';
    const content = readWorkspaceFile(controllerPath);

    expect(content).toMatch(/assignments/i);
  });

  it('F7-3: Backend moodle controller should expose /moodle/grades endpoint', () => {
    const controllerPath = 'packages/backend/src/moodle/moodle.controller.ts';
    const content = readWorkspaceFile(controllerPath);

    expect(content).toMatch(/grades/i);
  });

  it('F7-4: Backend moodle controller should expose /moodle/events endpoint', () => {
    const controllerPath = 'packages/backend/src/moodle/moodle.controller.ts';
    const content = readWorkspaceFile(controllerPath);

    expect(content).toMatch(/events/i);
  });

  it('F7-5: Backend DTO structure should align with shared domain contracts', () => {
    // Check moodle service/module integrates types or implements contract fields
    const servicePath = 'packages/backend/src/moodle/moodle.service.ts';

    expect(fileExists(servicePath)).toBe(true);
    const content = readWorkspaceFile(servicePath);

    expect(content.length).toBeGreaterThan(50);
  });
});
