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

  it('allows the local portal origin', (done) => {
    originValidator('http://localhost:3000', (err, allow) => {
      expect(allow).toBe(true);
      done();
    });
  });

  it.each([
    'https://moodle.karazin.ua',
    'https://moodle.universemvp.tech',
    'http://localhost:8080',
  ])('rejects unconfigured origin %s', (origin) => {
    const callback = jest.fn();

    originValidator(origin, callback);
    expect(callback).toHaveBeenCalledWith(null, false);
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
