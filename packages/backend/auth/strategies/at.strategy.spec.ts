import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { UserService } from '../../user/user.service';
import { AtStrategy, JwtPayload } from './at.strategy';

describe('AtStrategy', () => {
  const originalEnv = process.env;
  const findById = jest.fn();
  const userService = { findById } as unknown as UserService;

  beforeEach(() => {
    jest.resetModules();
    findById.mockReset();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw an error if AT_SECRET is not set', () => {
    delete process.env.AT_SECRET;

    expect(() => new AtStrategy(userService)).toThrow(
      'AT_SECRET environment variable is not set securely',
    );
  });

  it('should throw an error if AT_SECRET is the default insecure placeholder', () => {
    process.env.AT_SECRET = 'your-access-token-secret-key';

    expect(() => new AtStrategy(userService)).toThrow(
      'AT_SECRET environment variable is not set securely',
    );
  });

  it('should instantiate successfully with a secure secret', () => {
    process.env.AT_SECRET = 'a-secure-production-ready-secret-key-12345';

    const strategy = new AtStrategy(userService);

    expect(strategy).toBeDefined();
  });

  it('validate() should return identity fields and strip any Moodle token claims', async () => {
    process.env.AT_SECRET = 'a-secure-production-ready-secret-key-12345';
    findById.mockResolvedValue({ roles: ['MOODLE_STUDENT'] });

    const strategy = new AtStrategy(userService);
    const payload = {
      sub: 'user-123',
      email: 'student@karazin.ua',
      roles: ['MOODLE_STUDENT'],
      moodleToken: 'legacy-token-abc',
      moodleId: 'moodle-999',
    } as JwtPayload;

    const result = await strategy.validate(payload);

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

  it('validate() should take roles from the user store, not from the token', async () => {
    process.env.AT_SECRET = 'a-secure-production-ready-secret-key-12345';
    findById.mockResolvedValue({ roles: ['OPPORTUNITIES_USER'] });

    const strategy = new AtStrategy(userService);

    const result = await strategy.validate({
      sub: 'demoted-moderator',
      email: 'moderator@karazin.ua',
      roles: ['OPPORTUNITIES_MODERATOR'],
    });

    expect(findById).toHaveBeenCalledWith('demoted-moderator');
    expect(result.roles).toEqual(['OPPORTUNITIES_USER']);
  });

  it('validate() should reject a token whose user no longer exists', async () => {
    process.env.AT_SECRET = 'a-secure-production-ready-secret-key-12345';
    findById.mockResolvedValue(null);

    const strategy = new AtStrategy(userService);

    await expect(
      strategy.validate({ sub: 'deleted-user', email: 'gone@karazin.ua' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should extract JWT from Authorization Bearer header first, falling back to httpOnly accessToken cookie', () => {
    process.env.AT_SECRET = 'a-secure-production-ready-secret-key-12345';

    const strategy = new AtStrategy(userService) as unknown as {
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
