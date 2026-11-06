import { createHash } from 'node:crypto';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GripBrowserAuthService } from '../grip-browser-auth.service';
import type { PrismaClient as PrismaService } from '@universe/database';
import type { GithubClientService } from '../../github-client.service';
import type { GripHostedConfig } from '../grip-hosted.types';

const config: GripHostedConfig = {
  frontendOrigin: 'https://portal.example',
  callbackUrl: 'https://portal.example/dev-tools/grip/api/auth/callback',
  oauthClientSecret: 'oauth-secret',
  encryptionKeys: new Map([['v1', Buffer.alloc(32, 1)]]),
  activeKeyVersion: 'v1',
  cleanupAudience: 'https://backend.example/cleanup',
  cleanupServiceAccountEmail: 'cleanup@example.iam.gserviceaccount.com',
};

function fixture() {
  const prisma = {
    gripOAuthTransaction: {
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'transaction',
        ...data,
      })),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    gripBrowserSession: {
      create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'session', ...data })),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const transaction = jest.fn(async (operation) => operation(prisma));

  Object.assign(prisma, { $transaction: transaction });
  const github = {
    exchangeAuthorizationCode: jest.fn().mockResolvedValue('github-access'),
    identify: jest.fn().mockResolvedValue({ githubId: '123', login: 'developer' }),
    assertWriter: jest.fn().mockResolvedValue(undefined),
  };
  const service = new GripBrowserAuthService(
    prisma as unknown as PrismaService,
    github as unknown as GithubClientService,
  );

  return { prisma, github, service };
}

describe('hosted Grip browser authentication', () => {
  it('should not create an OAuth transaction without a configured GitHub client ID', async () => {
    const { prisma, service } = fixture();

    await expect(
      service.startBrowserLogin({
        config,
        clientId: '',
        browserBinding: 'a'.repeat(43),
        returnCheckId: 'b'.repeat(43),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.gripOAuthTransaction.create).not.toHaveBeenCalled();
  });
  it('should bind the OAuth transaction to its initiating browser and exact callback', async () => {
    const { prisma, service } = fixture();
    const result = await service.startBrowserLogin({
      config,
      clientId: 'client',
      browserBinding: 'a'.repeat(43),
      returnCheckId: 'b'.repeat(43),
    });
    const url = new URL(result.authorizationUrl);
    const state = url.searchParams.get('state')!;
    const stored = prisma.gripOAuthTransaction.create.mock.calls[0][0].data;

    expect(url.origin).toBe('https://github.com');
    expect(url.searchParams.get('redirect_uri')).toBe(config.callbackUrl);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('');
    expect(stored.stateHash).toBe(createHash('sha256').update(state).digest('hex'));
    expect(stored.browserHash).toBe(createHash('sha256').update('a'.repeat(43)).digest('hex'));
    expect(JSON.stringify(stored)).not.toContain(state);
    expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBe(600_000);
  });

  it('should consume callback once and keep the GitHub access token out of persisted sessions', async () => {
    const { prisma, github, service } = fixture();
    const start = await service.startBrowserLogin({
      config,
      clientId: 'client',
      browserBinding: 'a'.repeat(43),
      returnCheckId: 'b'.repeat(43),
    });
    const transaction = prisma.gripOAuthTransaction.create.mock.results[0];

    prisma.gripOAuthTransaction.findUnique.mockResolvedValue(await transaction.value);
    const result = await service.completeBrowserLogin({
      config,
      clientId: 'client',
      state: new URL(start.authorizationUrl).searchParams.get('state')!,
      code: 'code',
      browserBinding: 'a'.repeat(43),
      previousSession: 'p'.repeat(43),
    });
    const stored = prisma.gripBrowserSession.create.mock.calls[0][0].data;

    expect(result.identity.githubId).toBe('123');
    expect(result.returnCheckId).toBe('b'.repeat(43));
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(stored.tokenHash).toBe(createHash('sha256').update(result.token).digest('hex'));
    expect(JSON.stringify(stored)).not.toContain('github-access');
    expect(prisma.gripBrowserSession.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash('sha256').update('p'.repeat(43)).digest('hex'),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(github.assertWriter).toHaveBeenCalledWith({
      githubId: '123',
      login: 'developer',
    });
    prisma.gripOAuthTransaction.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.completeBrowserLogin({
        config,
        clientId: 'client',
        state: new URL(start.authorizationUrl).searchParams.get('state')!,
        code: 'code',
        browserBinding: 'a'.repeat(43),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(github.exchangeAuthorizationCode).toHaveBeenCalledTimes(1);
  });

  it('should fail when an invalid previous-session value is supplied', async () => {
    const { service } = fixture();

    await expect(
      service.completeBrowserLogin({
        config,
        clientId: 'client',
        browserBinding: 'a'.repeat(43),
        state: 'b'.repeat(43),
        code: 'code',
        previousSession: 'invalid',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should reject an expired transaction or another browser before exchanging the code', async () => {
    const { prisma, github, service } = fixture();
    const start = await service.startBrowserLogin({
      config,
      clientId: 'client',
      browserBinding: 'a'.repeat(43),
      returnCheckId: 'b'.repeat(43),
    });
    const stored = await prisma.gripOAuthTransaction.create.mock.results[0].value;

    prisma.gripOAuthTransaction.findUnique.mockResolvedValue(stored);
    const input = {
      config,
      clientId: 'client',
      state: new URL(start.authorizationUrl).searchParams.get('state')!,
      code: 'code',
      browserBinding: 'c'.repeat(43),
    };

    await expect(service.completeBrowserLogin(input)).rejects.toBeInstanceOf(UnauthorizedException);
    stored.expiresAt = new Date(0);
    await expect(
      service.completeBrowserLogin({
        ...input,
        browserBinding: 'a'.repeat(43),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(github.exchangeAuthorizationCode).not.toHaveBeenCalled();
  });

  it('should require the exact origin and session CSRF token before accepting a mutation', () => {
    const { service } = fixture();
    const identity = {
      githubId: '123',
      login: 'developer',
      csrfToken: 'a'.repeat(43),
      expiresAt: new Date().toISOString(),
    };

    expect(() =>
      service.assertCsrf({
        identity,
        config,
        origin: config.frontendOrigin,
        csrfToken: identity.csrfToken,
      }),
    ).not.toThrow();
    expect(() =>
      service.assertCsrf({
        identity,
        config,
        origin: 'https://attacker.example',
        csrfToken: identity.csrfToken,
      }),
    ).toThrow(ForbiddenException);
    expect(() =>
      service.assertCsrf({
        identity,
        config,
        origin: config.frontendOrigin,
        csrfToken: 'b'.repeat(43),
      }),
    ).toThrow(ForbiddenException);
    expect(() => service.assertCsrf({ identity, config, origin: '', csrfToken: '' })).toThrow(
      ForbiddenException,
    );
  });
});
