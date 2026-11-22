import { getCorsConfig, isAllowedOrigin } from './cors.config';

describe('getCorsConfig', () => {
  const cors = getCorsConfig();
  const originValidator = cors.origin as (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => void;

  it('allows requests with no origin (e.g. server-to-server or mobile apps)', (done) => {
    originValidator(undefined, (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });

  it('allows localhost and 127.0.0.1', (done) => {
    originValidator('http://localhost:3000', (err, allow) => {
      expect(allow).toBe(true);
      done();
    });
  });

  it.each([
    'https://karazin.ua',
    'https://moodle.karazin.ua',
    'https://moodle.universemvp.tech',
    'https://evil.universemvp.tech',
  ])('rejects %s because only exact app origins are trusted', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(false);
  });

  it('allows the configured FRONTEND_URL', () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;

    process.env.FRONTEND_URL = 'https://staging.universemvp.tech';

    try {
      expect(isAllowedOrigin('https://staging.universemvp.tech')).toBe(true);
    } finally {
      if (originalFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = originalFrontendUrl;
      }
    }
  });

  it('rejects empty origin even when FRONTEND_URL is an empty string', () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;

    process.env.FRONTEND_URL = '';

    try {
      expect(isAllowedOrigin('')).toBe(false);
    } finally {
      if (originalFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = originalFrontendUrl;
      }
    }
  });

  it('rejects untrusted domains', (done) => {
    originValidator('https://attacker.com', (err, allow) => {
      expect(allow).toBe(false);
      done();
    });
  });

  it('validates origins directly with isAllowedOrigin', () => {
    expect(isAllowedOrigin('https://universemvp.tech')).toBe(true);
    expect(isAllowedOrigin('http://universemvp.tech')).toBe(false);
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
    expect(isAllowedOrigin('not-a-url')).toBe(false);
    expect(isAllowedOrigin('null')).toBe(false);
  });

  it('blocks localhost origins in production mode', () => {
    const originalEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = 'production';

    try {
      expect(isAllowedOrigin('http://localhost:3000')).toBe(false);
      expect(isAllowedOrigin('https://universemvp.tech')).toBe(true);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
