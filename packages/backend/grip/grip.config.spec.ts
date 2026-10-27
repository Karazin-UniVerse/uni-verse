import { getGripConfig, GripConfigException } from './grip.config';

describe('grip.config', () => {
  const validBaseEnv: NodeJS.ProcessEnv = {
    GRIP_GATEWAY_ENABLED: 'true',
    GEMINI_API_KEY: 'test-gemini-secret-key-12345',
    GRIP_GEMINI_MODEL: 'gemini-3.5-flash-lite',
    GRIP_GEMINI_BASE_URL:
      'https://generativelanguage.googleapis.com/v1beta/openai',
    GRIP_GITHUB_API_URL: 'https://api.github.com',
    GRIP_GITHUB_OAUTH_CLIENT_ID: 'test-oauth-client-id',
    GRIP_GITHUB_PERMISSION_TOKEN: 'test-github-permission-token-67890',
    GRIP_GITHUB_OWNER: 'Karazin-UniVerse',
    GRIP_GITHUB_REPOSITORY: 'uni-verse',
    GRIP_TRUSTED_PROXY_ADDRESSES: '127.0.0.1,::1',
  };

  it('disabled needs no secrets', () => {
    expect(getGripConfig({})).toBeNull();
    expect(getGripConfig({ GRIP_GATEWAY_ENABLED: 'false' })).toBeNull();
    expect(getGripConfig({ GRIP_GATEWAY_ENABLED: '0' })).toBeNull();
    expect(getGripConfig({ GRIP_GATEWAY_ENABLED: '' })).toBeNull();
  });

  it('enabled incomplete config fails without exposing values', () => {
    const requiredKeys: (keyof typeof validBaseEnv)[] = [
      'GEMINI_API_KEY',
      'GRIP_GEMINI_MODEL',
      'GRIP_GEMINI_BASE_URL',
      'GRIP_GITHUB_API_URL',
      'GRIP_GITHUB_OAUTH_CLIENT_ID',
      'GRIP_GITHUB_PERMISSION_TOKEN',
      'GRIP_GITHUB_OWNER',
      'GRIP_GITHUB_REPOSITORY',
    ];

    for (const key of requiredKeys) {
      const incompleteEnv = { ...validBaseEnv };

      delete incompleteEnv[key];

      expect(() => getGripConfig(incompleteEnv)).toThrow(GripConfigException);

      try {
        getGripConfig(incompleteEnv);
      } catch (error) {
        expect(error).toBeInstanceOf(GripConfigException);
        const message = (error as Error).message;

        expect(message).not.toContain('test-gemini-secret-key');
        expect(message).not.toContain('test-github-permission-token');
      }
    }
  });

  it('rejects unsupported models, protocols and credentials in URLs', () => {
    expect(() =>
      getGripConfig({
        ...validBaseEnv,
        GRIP_GEMINI_MODEL: 'gemini-1.5-pro',
      }),
    ).toThrow(GripConfigException);

    expect(() =>
      getGripConfig({
        ...validBaseEnv,
        GRIP_GEMINI_BASE_URL: 'http://external-insecure-site.com/v1',
      }),
    ).toThrow(GripConfigException);

    expect(() =>
      getGripConfig({
        ...validBaseEnv,
        GRIP_GEMINI_BASE_URL:
          'https://user:pass@generativelanguage.googleapis.com/v1',
      }),
    ).toThrow(GripConfigException);

    expect(() =>
      getGripConfig({
        ...validBaseEnv,
        GRIP_GITHUB_API_URL: 'https://user:pass@api.github.com',
      }),
    ).toThrow(GripConfigException);
  });

  it('accepts loopback HTTP URLs for development and tests', () => {
    const loopbackEnv: NodeJS.ProcessEnv = {
      ...validBaseEnv,
      GRIP_GEMINI_BASE_URL: 'http://127.0.0.1:9099/v1',
      GRIP_GITHUB_API_URL: 'http://localhost:9098',
    };

    const config = getGripConfig(loopbackEnv);

    expect(config).not.toBeNull();
    expect(config?.geminiBaseUrl).toBe('http://127.0.0.1:9099/v1');
    expect(config?.githubApiUrl).toBe('http://localhost:9098');
    expect(config?.trustedProxyAddresses).toEqual(['127.0.0.1', '::1']);
  });
});
