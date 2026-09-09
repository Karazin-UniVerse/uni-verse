import { describe, it, expect, afterEach } from 'vitest';
import { MoodleClientService } from '../../../packages/backend/src/moodle/moodle-client/moodle.client.service';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 6: Backend Moodle Gateway Host Alignment (@universe/backend)', () => {
  const originalMoodleUrl = process.env.MOODLE_BASEURL;

  afterEach(() => {
    if (originalMoodleUrl !== undefined) {
      process.env.MOODLE_BASEURL = originalMoodleUrl;
    } else {
      delete process.env.MOODLE_BASEURL;
    }
  });

  it('F6-1: MoodleClientService constructs successfully with https:// URL', () => {
    process.env.MOODLE_BASEURL = 'https://moodle.universemvp.tech';

    expect(() => new MoodleClientService()).not.toThrow();
  });

  it('F6-2: MoodleClientService throws when constructed with insecure http:// URL', () => {
    process.env.MOODLE_BASEURL = 'http://moodle.universemvp.tech';

    expect(() => new MoodleClientService()).toThrow(
      'MOODLE_BASEURL must be a secure URL (https://)',
    );
  });

  it('F6-3: MoodleClientService throws when MOODLE_BASEURL is missing or whitespace', () => {
    delete process.env.MOODLE_BASEURL;
    expect(() => new MoodleClientService()).toThrow(
      'MOODLE_BASEURL must be a secure URL (https://)',
    );

    process.env.MOODLE_BASEURL = '   ';
    expect(() => new MoodleClientService()).toThrow(
      'MOODLE_BASEURL must be a secure URL (https://)',
    );
  });

  it('F6-4: Backend services and helpers must not contain legacy moodle.karazin.ua host', () => {
    const filesServicePath = 'packages/backend/src/moodle/moodle-files/moodle-files.service.ts';
    const credsPath = 'packages/backend/src/utils/get-creds.ts';
    const clientPath = 'packages/backend/src/moodle/moodle-client/moodle.client.service.ts';

    expect(readWorkspaceFile(clientPath)).not.toContain('https://moodle.karazin.ua');
    expect(readWorkspaceFile(filesServicePath)).not.toContain('https://moodle.karazin.ua');
    expect(readWorkspaceFile(credsPath)).not.toContain('https://moodle.karazin.ua');
  });

  it('F6-5: root .env.example should configure MOODLE_BASEURL to https://moodle.universemvp.tech', () => {
    const envExamplePath = '.env.example';

    expect(fileExists(envExamplePath)).toBe(true);
    const content = readWorkspaceFile(envExamplePath);

    expect(content).toMatch(/MOODLE_BASEURL\s*=\s*"?https:\/\/moodle\.universemvp\.tech"?/);
  });
});
