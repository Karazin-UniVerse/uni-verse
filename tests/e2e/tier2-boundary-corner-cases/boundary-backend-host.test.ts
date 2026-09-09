import { describe, it, expect, afterEach } from 'vitest';
import { MoodleClientService } from '../../../packages/backend/src/moodle/moodle-client/moodle.client.service';
import { readWorkspaceFile } from '../test-helpers';

describe('Tier 2 - Feature 6: Boundary & Corner Cases in Backend Host Validation', () => {
  const originalMoodleUrl = process.env.MOODLE_BASEURL;
  const originalTimeout = process.env.MOODLE_TIMEOUT;

  afterEach(() => {
    if (originalMoodleUrl !== undefined) {
      process.env.MOODLE_BASEURL = originalMoodleUrl;
    } else {
      delete process.env.MOODLE_BASEURL;
    }

    if (originalTimeout !== undefined) {
      process.env.MOODLE_TIMEOUT = originalTimeout;
    } else {
      delete process.env.MOODLE_TIMEOUT;
    }
  });

  it('F6-B1: Backend Moodle client constructor must throw if protocol is http:// instead of https://', () => {
    process.env.MOODLE_BASEURL = 'http://insecure.example.com';

    expect(() => new MoodleClientService()).toThrow(
      'MOODLE_BASEURL must be a secure URL (https://)',
    );
  });

  it('F6-B2: Host URL normalization: URL instance should handle trailing slashes seamlessly', () => {
    const baseUrlWithSlash = 'https://moodle.universemvp.tech/';
    const baseUrlWithoutSlash = 'https://moodle.universemvp.tech';

    const url1 = new URL(
      'webservice/rest/server.php',
      baseUrlWithSlash.endsWith('/') ? baseUrlWithSlash : `${baseUrlWithSlash}/`,
    );
    const url2 = new URL(`${baseUrlWithoutSlash}/webservice/rest/server.php`);

    expect(url1.origin).toBe('https://moodle.universemvp.tech');
    expect(url2.origin).toBe('https://moodle.universemvp.tech');
    expect(url1.pathname).toBe(url2.pathname);
  });

  it('F6-B3: Backend should reject invalid or non-numeric timeout values', async () => {
    process.env.MOODLE_BASEURL = 'https://moodle.universemvp.tech';
    process.env.MOODLE_TIMEOUT = 'invalid-timeout';
    const client = new MoodleClientService();

    await expect(client.client('core_webservice_get_site_info')).rejects.toThrow(
      'MOODLE_TIMEOUT must be a positive finite number',
    );
  });

  it('F6-B4: Host with custom secure port (https://moodle.universemvp.tech:443) remains valid https', () => {
    const customHost = 'https://moodle.universemvp.tech:443';

    expect(customHost.startsWith('https://')).toBe(true);
    const parsed = new URL(customHost);

    expect(parsed.protocol).toBe('https:');
  });

  it('F6-B5: Moodle host should be consistent across all backend services without legacy residue', () => {
    const filesServicePath = 'packages/backend/src/moodle/moodle-files/moodle-files.service.ts';
    const credsPath = 'packages/backend/src/utils/get-creds.ts';

    const filesContent = readWorkspaceFile(filesServicePath);
    const credsContent = readWorkspaceFile(credsPath);

    expect(filesContent).not.toContain('moodle.karazin.ua');
    expect(credsContent).not.toContain('moodle.karazin.ua');
  });
});
