import { getGripHostedConfig } from '../grip-hosted.config';
import { ForbiddenException } from '@nestjs/common';

const environment: NodeJS.ProcessEnv = {
  GRIP_HOSTED_ENABLED: 'true',
  GRIP_HOSTED_RETENTION_VERIFIED: 'true',
  GRIP_HOSTED_FRONTEND_ORIGIN: 'https://portal.example',
  GRIP_GITHUB_OAUTH_CLIENT_SECRET: 'test-oauth-secret',
  GRIP_CONTENT_KEYRING: JSON.stringify({
    current: Buffer.alloc(32, 1).toString('base64'),
  }),
  GRIP_CONTENT_ACTIVE_KEY_VERSION: 'current',
  GRIP_CLEANUP_OIDC_AUDIENCE: 'https://backend.example/dev-tools/grip/internal/cleanup',
  GRIP_CLEANUP_SERVICE_ACCOUNT_EMAIL: 'cleanup@example.iam.gserviceaccount.com',
};

describe('hosted Grip configuration', () => {
  it('should keep hosted mode disabled without reading secrets', () => {
    expect(getGripHostedConfig({ GRIP_HOSTED_ENABLED: 'false' })).toBeNull();
  });

  it('should classify unverified activation as a policy denial, not an outage', () => {
    expect(() =>
      getGripHostedConfig({
        ...environment,
        GRIP_HOSTED_RETENTION_VERIFIED: 'false',
      }),
    ).toThrow(ForbiddenException);
  });

  it('should derive only the fixed OAuth callback and decode a bounded keyring', () => {
    const config = getGripHostedConfig(environment);

    expect(config?.callbackUrl).toBe('https://portal.example/dev-tools/grip/api/auth/callback');
    expect(config?.encryptionKeys.get('current')).toEqual(Buffer.alloc(32, 1));
    expect(config?.activeKeyVersion).toBe('current');
  });

  it('should reject duplicate versions even when both values decode to valid keys', () => {
    const encoded = Buffer.alloc(32, 1).toString('base64');

    expect(() =>
      getGripHostedConfig({
        ...environment,
        GRIP_CONTENT_KEYRING: `{"current":"${encoded}","current":"${encoded}"}`,
      }),
    ).toThrow();
  });

  it.each([
    { GRIP_HOSTED_RETENTION_VERIFIED: 'false' },
    { GRIP_HOSTED_FRONTEND_ORIGIN: 'https://portal.example/path' },
    { GRIP_HOSTED_FRONTEND_ORIGIN: 'http://portal.example' },
    { GRIP_HOSTED_FRONTEND_ORIGIN: 'https://user:secret@portal.example' },
    { GRIP_HOSTED_FRONTEND_ORIGIN: 'https://portal.example?secret=value' },
    { GRIP_CONTENT_KEYRING: '{"current":"not-a-key"}' },
    { GRIP_CONTENT_KEYRING: '{"current":"AQ==","current":"Ag=="}' },
    { GRIP_CONTENT_ACTIVE_KEY_VERSION: 'missing' },
    { GRIP_GITHUB_OAUTH_CLIENT_SECRET: '' },
    { GRIP_CLEANUP_SERVICE_ACCOUNT_EMAIL: 'not-an-email' },
    { GRIP_CLEANUP_OIDC_AUDIENCE: 'http://external.example/cleanup' },
  ])('should refuse invalid enabled configuration (%#)', (changes) => {
    expect(() => getGripHostedConfig({ ...environment, ...changes })).toThrow();
  });
});
