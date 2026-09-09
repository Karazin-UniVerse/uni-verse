import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 6: Backend Moodle Gateway Host Alignment (@universe/backend)', () => {
  it('F6-1: MoodleClientService should require MOODLE_BASEURL and forbid legacy moodle.karazin.ua', () => {
    const servicePath = 'packages/backend/src/moodle/moodle-client/moodle.client.service.ts';

    expect(fileExists(servicePath)).toBe(true);
    const content = readWorkspaceFile(servicePath);

    expect(content).toContain('process.env.MOODLE_BASEURL');
    expect(content).not.toContain('https://moodle.karazin.ua');
  });

  it('F6-2: MoodleClientService should strictly enforce https:// protocol', () => {
    const servicePath = 'packages/backend/src/moodle/moodle-client/moodle.client.service.ts';
    const content = readWorkspaceFile(servicePath);

    expect(content).toMatch(/baseUrl\.startsWith\(['"]https:\/\//);
  });

  it('F6-3: moodle-files.service.ts should require MOODLE_BASEURL and forbid legacy moodle.karazin.ua', () => {
    const filesServicePath = 'packages/backend/src/moodle/moodle-files/moodle-files.service.ts';

    expect(fileExists(filesServicePath)).toBe(true);
    const content = readWorkspaceFile(filesServicePath);

    expect(content).toContain('process.env.MOODLE_BASEURL');
    expect(content).not.toContain('https://moodle.karazin.ua');
  });

  it('F6-4: get-creds.ts helper should require MOODLE_BASEURL and forbid legacy moodle.karazin.ua', () => {
    const credsPath = 'packages/backend/src/utils/get-creds.ts';

    expect(fileExists(credsPath)).toBe(true);
    const content = readWorkspaceFile(credsPath);

    expect(content).toContain('process.env.MOODLE_BASEURL');
    expect(content).not.toContain('https://moodle.karazin.ua');
  });

  it('F6-5: root .env.example should configure MOODLE_BASEURL to https://moodle.universemvp.tech', () => {
    const envExamplePath = '.env.example';

    expect(fileExists(envExamplePath)).toBe(true);
    const content = readWorkspaceFile(envExamplePath);

    expect(content).toMatch(/MOODLE_BASEURL\s*=\s*"?https:\/\/moodle\.universemvp\.tech"?/);
  });
});
