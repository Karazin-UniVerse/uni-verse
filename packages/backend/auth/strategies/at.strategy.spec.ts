import type { Request } from 'express';
import { AtStrategy, JwtPayload } from './at.strategy';

describe('AtStrategy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw an error if AT_SECRET is not set', () => {
    delete process.env.AT_SECRET;

    expect(() => new AtStrategy()).toThrow(
      'AT_SECRET environment variable is not set securely',
    );
  });

  it('should throw an error if AT_SECRET is the default insecure placeholder', () => {
    process.env.AT_SECRET = 'your-access-token-secret-key';

    expect(() => new AtStrategy()).toThrow(
      'AT_SECRET environment variable is not set securely',
    );
  });

  it('should instantiate successfully with a secure secret', () => {
    process.env.AT_SECRET = 'a-secure-production-ready-secret-key-12345';

    const strategy = new AtStrategy();

    expect(strategy).toBeDefined();
  });

  it('validate() should return identity fields and strip any Moodle token claims', () => {
    process.env.AT_SECRET = 'a-secure-production-ready-secret-key-12345';

    const strategy = new AtStrategy();
    const payload = {
      sub: 'user-123',
      email: 'student@karazin.ua',
      roles: ['MOODLE_STUDENT'],
      moodleToken: 'legacy-token-abc',
      moodleId: 'moodle-999',
    } as JwtPayload;

    const result = strategy.validate(payload);

    expect(result).toEqual({
      sub: 'user-123',
      email: 'student@karazin.ua',
      roles: ['MOODLE_STUDENT'],
    });
    expect(
      (result as unknown as Record<string, unknown>).moodleToken,
    ).toBeUndefined();
    expect(
      (result as unknown as Record<string, unknown>).moodleId,
    ).toBeUndefined();
  });

  it('should extract JWT from Authorization Bearer header first, falling back to httpOnly accessToken cookie', () => {
    process.env.AT_SECRET = 'a-secure-production-ready-secret-key-12345';

    const strategy = new AtStrategy() as unknown as {
      _jwtFromRequest: (req: Request) => string | null;
    };

    const bothReq = {
      cookies: { accessToken: 'cookie-jwt-token' },
      headers: { authorization: 'Bearer header-jwt-token' },
    } as unknown as Request;
    const cookieOnlyReq = {
      cookies: { accessToken: 'cookie-jwt-token' },
      headers: {},
    } as unknown as Request;

    expect(strategy._jwtFromRequest(bothReq)).toBe('header-jwt-token');
    expect(strategy._jwtFromRequest(cookieOnlyReq)).toBe('cookie-jwt-token');
  });
});
