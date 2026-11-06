import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { GripCleanupGuard } from '../grip-cleanup.guard';

describe('hosted cleanup OIDC identity', () => {
  const audience = 'https://backend.example/dev-tools/grip/internal/cleanup';
  const email = 'cleanup@example.iam.gserviceaccount.com';
  const saved = {
    audience: process.env.GRIP_CLEANUP_OIDC_AUDIENCE,
    email: process.env.GRIP_CLEANUP_SERVICE_ACCOUNT_EMAIL,
  };
  const payload = {
    iss: 'https://accounts.google.com',
    aud: audience,
    sub: 'scheduler',
    email,
    email_verified: true,
    exp: Math.floor(Date.now() / 1000) + 60,
  };

  beforeEach(() => {
    process.env.GRIP_CLEANUP_OIDC_AUDIENCE = audience;
    process.env.GRIP_CLEANUP_SERVICE_ACCOUNT_EMAIL = email;
  });

  afterEach(() => {
    jest.restoreAllMocks();

    for (const [key, value] of [
      ['GRIP_CLEANUP_OIDC_AUDIENCE', saved.audience],
      ['GRIP_CLEANUP_SERVICE_ACCOUNT_EMAIL', saved.email],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  });

  function context(header?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: header } }),
      }),
    } as ExecutionContext;
  }

  it('uses signature verification with the configured audience even while hosted UI is disabled', async () => {
    const verify = jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockResolvedValue({ getPayload: () => payload } as never);

    await expect(
      new GripCleanupGuard().canActivate(context('Bearer signed-token')),
    ).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith({ idToken: 'signed-token', audience });
  });

  it.each([
    { email: 'wrong@example.iam.gserviceaccount.com' },
    { email_verified: false },
    { iss: 'https://evil.example' },
    { aud: 'wrong' },
    { exp: 0 },
  ])('rejects invalid verified claims %j', async (change) => {
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({ ...payload, ...change }),
    } as never);

    await expect(
      new GripCleanupGuard().canActivate(context('Bearer signed-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects missing credentials and signature verification failures', async () => {
    jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockImplementation(() => {
        throw new Error('invalid signature');
      });

    await expect(
      new GripCleanupGuard().canActivate(context()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      new GripCleanupGuard().canActivate(context('Bearer forged-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
