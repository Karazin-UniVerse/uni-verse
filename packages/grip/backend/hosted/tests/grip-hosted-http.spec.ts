import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { GripBrowserAuthController } from '../grip-browser-auth.controller';
import { GripBrowserAuthService } from '../grip-browser-auth.service';
import { GripHostedGuard } from '../grip-hosted.guard';
import { GripHostedRateLimitService } from '../grip-hosted-rate-limit.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GripQuotaService } from '../../grip-quota.service';
import * as gripHelpers from '../../grip.helpers';
import { GripBrowserCheckController } from '../grip-browser-check.controller';
import { GripCheckService } from '../grip-check.service';
import { GripCheckStorageService } from '../grip-check-storage.service';

describe('hosted Grip browser HTTP boundary', () => {
  let app: INestApplication;
  const auth = {
    authenticateBrowser: jest.fn(),
    completeBrowserLogin: jest.fn(),
    assertCsrf: jest.fn(),
    revokeBrowserSession: jest.fn(),
  };
  const limits = { reserveRead: jest.fn(), reserveAuthStart: jest.fn() };
  const quota = { reserveSessionExchange: jest.fn() };
  const checks = { submit: jest.fn() };
  const environment = {
    GRIP_HOSTED_ENABLED: 'true',
    GRIP_HOSTED_RETENTION_VERIFIED: 'true',
    GRIP_HOSTED_FRONTEND_ORIGIN: 'https://portal.example',
    GRIP_GITHUB_OAUTH_CLIENT_SECRET: 'secret',
    GRIP_CONTENT_KEYRING: JSON.stringify({
      v1: Buffer.alloc(32, 1).toString('base64'),
    }),
    GRIP_CONTENT_ACTIVE_KEY_VERSION: 'v1',
    GRIP_CLEANUP_OIDC_AUDIENCE: 'https://backend.example/cleanup',
    GRIP_CLEANUP_SERVICE_ACCOUNT_EMAIL: 'cleanup@example.iam.gserviceaccount.com',
  };
  const saved = new Map<string, string | undefined>();

  beforeAll(async () => {
    for (const [key, value] of Object.entries(environment)) {
      saved.set(key, process.env[key]);
      process.env[key] = value;
    }

    const module = await Test.createTestingModule({
      controllers: [GripBrowserAuthController, GripBrowserCheckController],
      providers: [
        { provide: GripBrowserAuthService, useValue: auth },
        { provide: GripHostedRateLimitService, useValue: limits },
        { provide: GripCheckService, useValue: checks },
        { provide: GripCheckStorageService, useValue: {} },
        { provide: GripQuotaService, useValue: quota },
        GripHostedGuard,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();

    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    auth.authenticateBrowser.mockResolvedValue({
      githubId: '123',
      login: 'developer',
      expiresAt: new Date().toISOString(),
      csrfToken: 'csrf',
    });
  });

  it('should reject the CLI bearer scheme on browser-only endpoints', async () => {
    await request(app.getHttpServer())
      .get('/dev-tools/grip/browser/session')
      .set('Authorization', 'Bearer cli-token')
      .expect(401);
    expect(auth.authenticateBrowser).not.toHaveBeenCalled();
  });

  it('should enforce the inherited exchange limit before OAuth callback work', async () => {
    jest
      .spyOn(gripHelpers, 'resolveGripConfig')
      .mockReturnValue({ trustedProxyAddresses: [] } as never);
    quota.reserveSessionExchange.mockRejectedValueOnce(
      new HttpException('Exchange limited', HttpStatus.TOO_MANY_REQUESTS),
    );
    const complete = jest.spyOn(auth, 'completeBrowserLogin');
    const response = await request(app.getHttpServer())
      .post('/dev-tools/grip/browser/auth/callback')
      .send({
        state: 'a'.repeat(43),
        browserBinding: 'b'.repeat(43),
        code: 'code',
      })
      .expect(429);

    expect(response.text).not.toContain('browserBinding');
    expect(complete).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('should reject callback requests that attach fields outside the fixed contract', async () => {
    jest
      .spyOn(gripHelpers, 'resolveGripConfig')
      .mockReturnValue({ trustedProxyAddresses: [] } as never);
    await request(app.getHttpServer())
      .post('/dev-tools/grip/browser/auth/callback')
      .send({
        state: 'a'.repeat(43),
        browserBinding: 'b'.repeat(43),
        code: 'fixture',
        ownerGithubId: 'other',
      })
      .expect(400);

    expect(auth.completeBrowserLogin).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('should return a fail-closed response if hosted retention confirmation is missing', async () => {
    process.env.GRIP_HOSTED_RETENTION_VERIFIED = 'false';

    try {
      await request(app.getHttpServer())
        .get('/dev-tools/grip/browser/session')
        .set('Authorization', 'GripBrowser opaque')
        .expect(403);
    } finally {
      process.env.GRIP_HOSTED_RETENTION_VERIFIED = 'true';
    }
  });

  it('should map gateway configuration refusal to a non-5xx response on hosted operations', async () => {
    const { GripConfigException } = await import('../../grip.config.ts');

    auth.authenticateBrowser.mockRejectedValueOnce(new GripConfigException('misconfigured'));
    await request(app.getHttpServer())
      .get('/dev-tools/grip/browser/session')
      .set('Authorization', 'GripBrowser opaque')
      .expect(403);
  });

  it('should not trust a caller-supplied forwarded IP when the proxy is not trusted', async () => {
    jest
      .spyOn(gripHelpers, 'resolveGripConfig')
      .mockReturnValue({ trustedProxyAddresses: [] } as never);
    auth.completeBrowserLogin.mockResolvedValue({
      token: 't'.repeat(43),
      identity: {
        githubId: '123',
        login: 'test',
        csrfToken: 'c'.repeat(43),
        expiresAt: new Date().toISOString(),
      },
      returnCheckId: 'a'.repeat(43),
    });
    await request(app.getHttpServer())
      .post('/dev-tools/grip/browser/auth/callback')
      .set('X-Forwarded-For', '203.0.113.99')
      .send({
        state: 'a'.repeat(43),
        browserBinding: 'b'.repeat(43),
        code: 'fixture',
      })
      .expect(201);

    expect(quota.reserveSessionExchange).not.toHaveBeenCalledWith('203.0.113.99');
    jest.restoreAllMocks();
  });

  it('should return only browser identity through a no-store response', async () => {
    auth.authenticateBrowser.mockResolvedValueOnce({
      githubId: '123',
      login: 'developer',
      expiresAt: new Date().toISOString(),
      csrfToken: 'csrf',
      privateToken: 'SECRET_PRIVATE_TOKEN',
    });
    const response = await request(app.getHttpServer())
      .get('/dev-tools/grip/browser/session')
      .set('Authorization', 'GripBrowser opaque-token')
      .expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toMatchObject({
      githubId: '123',
      login: 'developer',
    });
    expect(response.text).not.toContain('opaque-token');
    expect(response.text).not.toContain('SECRET_PRIVATE_TOKEN');
  });

  it('should apply CSRF/origin validation before revoking a browser session', async () => {
    await request(app.getHttpServer())
      .post('/dev-tools/grip/browser/logout')
      .set('Authorization', 'GripBrowser opaque-token')
      .set('Origin', 'https://portal.example')
      .set('X-Grip-CSRF', 'csrf')
      .expect(204);

    expect(auth.assertCsrf).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'https://portal.example',
        csrfToken: 'csrf',
      }),
    );
    expect(auth.revokeBrowserSession).toHaveBeenCalledWith('opaque-token');
  });

  it('returns Retry-After for a read throttle without exposing private identity', async () => {
    limits.reserveRead.mockRejectedValueOnce(
      new HttpException({ statusCode: 429, message: 'Limit exceeded', retryAfter: 17 }, 429),
    );
    const response = await request(app.getHttpServer())
      .get('/dev-tools/grip/browser/session')
      .set('Authorization', 'GripBrowser opaque-token')
      .expect(429);

    expect(response.headers['retry-after']).toBe('17');
    expect(response.text).not.toContain('developer');
  });

  it.each([
    { state: 'GRADING', code: 202 },
    { state: 'QUOTA_REJECTED', code: 429 },
    { state: 'PASSED', code: 200 },
  ])('returns $code for persisted $state submission outcomes', async ({ state, code }) => {
    checks.submit.mockResolvedValue({ checkId: 'a'.repeat(43), state });
    const response = await request(app.getHttpServer())
      .post(`/dev-tools/grip/browser/checks/${'a'.repeat(43)}/submissions`)
      .set('Authorization', 'GripBrowser opaque')
      .set('Origin', 'https://portal.example')
      .set('X-Grip-CSRF', 'csrf')
      .send({
        requestId: 'a'.repeat(16),
        boardRevision: 'b'.repeat(64),
        answers: Array.from({ length: 5 }, (_, index) => ({
          questionId: `q${index + 1}`,
          answer: 'Explanation',
        })),
      })
      .expect(code);

    expect(response.body.state).toBe(state);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('refuses unknown protected responses without reflecting private service fields', async () => {
    checks.submit.mockResolvedValue({
      checkId: 'a'.repeat(43),
      state: 'PASSED',
      rubric: 'SECRET_RUBRIC',
      internalId: 'SECRET_INTERNAL_ID',
    });
    const response = await request(app.getHttpServer())
      .post(`/dev-tools/grip/browser/checks/${'a'.repeat(43)}/submissions`)
      .set('Authorization', 'GripBrowser opaque')
      .set('Origin', 'https://portal.example')
      .set('X-Grip-CSRF', 'csrf')
      .send({
        requestId: 'a'.repeat(16),
        boardRevision: 'b'.repeat(64),
        answers: Array.from({ length: 5 }, (_, index) => ({
          questionId: `q${index + 1}`,
          answer: 'Explanation',
        })),
      })
      .expect(200);

    expect(response.text).not.toContain('SECRET_RUBRIC');
    expect(response.text).not.toContain('SECRET_INTERNAL_ID');
  });
});
