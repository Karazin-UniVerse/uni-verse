import { Public } from '../auth/decorators/public.decorator';
import {
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AtGuard } from '../auth/guards/at.guard';
import { AtStrategy } from '../auth/strategies/at.strategy';
import { configureBodyParsers } from '../utils/body-parsers';
import { PrismaService } from '../prisma/prisma.service';
import { GripModule } from './grip.module';
import { GithubClientService } from './github-client.service';
import { GeminiClientService } from './gemini-client.service';
import { GripStorageService } from './grip-storage.service';
import { GripQuotaService } from './grip-quota.service';

@Controller('portal-fixture')
class PortalFixtureController {
  @Public()
  @Post('large-data')
  largeData() {
    return { ok: true };
  }

  @Get('protected')
  protected() {
    return { student: true };
  }
}

describe('Grip HTTP Gateway (real Nest/Express parsing & guards)', () => {
  let app: INestApplication;
  let mockStorage: any;
  let mockQuota: any;
  let mockGithub: any;
  let mockGemini: any;

  const validToken = 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

  beforeAll(async () => {
    process.env.AT_SECRET = 'super-secret-at-token-key-for-testing-only-12345';
    process.env.GRIP_GATEWAY_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GRIP_GEMINI_MODEL = 'gemini-3.5-flash-lite';
    process.env.GRIP_GEMINI_BASE_URL = 'http://localhost:9099/v1';
    process.env.GRIP_GITHUB_API_URL = 'http://localhost:9098';
    process.env.GRIP_GITHUB_OAUTH_CLIENT_ID = 'test-client-id';
    process.env.GRIP_GITHUB_PERMISSION_TOKEN = 'test-pat';
    process.env.GRIP_GITHUB_OWNER = 'Karazin-UniVerse';
    process.env.GRIP_GITHUB_REPOSITORY = 'uni-verse';
    process.env.GRIP_TRUSTED_PROXY_ADDRESSES = '127.0.0.1';

    mockStorage = {
      createSession: jest.fn().mockResolvedValue({
        id: 'sess-1',
        tokenHash: 'hash',
        githubId: '1001',
        githubLogin: 'dev',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      }),
      findSession: jest.fn().mockImplementation(async (hash: string) => {
        if (hash === 'revoked' || hash === 'expired') {
          return null;
        }

        return {
          id: 'sess-1',
          tokenHash: hash,
          githubId: '1001',
          githubLogin: 'dev',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          revokedAt: null,
        };
      }),
      revokeSession: jest.fn().mockResolvedValue(undefined),
    };

    mockQuota = {
      reserveSessionExchange: jest.fn().mockResolvedValue(undefined),
      reserveCompletion: jest.fn().mockResolvedValue({ leaseId: 'lease-1' }),
      releaseCompletion: jest.fn().mockResolvedValue(undefined),
    };

    mockGithub = {
      identify: jest.fn().mockResolvedValue({ githubId: '1001', login: 'dev' }),
      assertWriter: jest.fn().mockResolvedValue(undefined),
    };

    mockGemini = {
      complete: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              role: 'assistant',
              content: '{"nodes": []}',
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, GripModule],
      controllers: [PortalFixtureController],
      providers: [
        AtStrategy,
        {
          provide: APP_GUARD,
          useClass: AtGuard,
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(GripStorageService)
      .useValue(mockStorage)
      .overrideProvider(GripQuotaService)
      .useValue(mockQuota)
      .overrideProvider(GithubClientService)
      .useValue(mockGithub)
      .overrideProvider(GeminiClientService)
      .useValue(mockGemini)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureBodyParsers(app as NestExpressApplication);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('session exchange returns 200, Cache-Control: no-store and issues session token', async () => {
    const res = await request(app.getHttpServer())
      .post('/dev-tools/grip/sessions')
      .set('Authorization', 'Bearer gho_valid')
      .expect(200);

    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.token).toBeDefined();
    expect(mockQuota.reserveSessionExchange).toHaveBeenCalled();
  });

  it('rejects session exchange without Authorization header with 401', async () => {
    await request(app.getHttpServer())
      .post('/dev-tools/grip/sessions')
      .expect(401);
  });

  it('rejects completions request without Authorization header with 401', async () => {
    await request(app.getHttpServer())
      .post('/dev-tools/grip/v1/chat/completions')
      .send({
        model: 'gemini-3.5-flash-lite',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'usr' },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'Board', schema: {} },
        },
      })
      .expect(401);
  });

  it('rejects completions request with non-existent or expired session with 401', async () => {
    mockStorage.findSession.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .post('/dev-tools/grip/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        model: 'gemini-3.5-flash-lite',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'usr' },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'Board', schema: {} },
        },
      })
      .expect(401);
  });

  it('rejects completions request when user lacks repository write permission with 403', async () => {
    mockGithub.assertWriter.mockRejectedValueOnce(
      new ForbiddenException('Write access required'),
    );

    await request(app.getHttpServer())
      .post('/dev-tools/grip/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        model: 'gemini-3.5-flash-lite',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'usr' },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'Board', schema: {} },
        },
      })
      .expect(403);
  });

  it('proxies valid completion and returns 200 with Grip response envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/dev-tools/grip/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        model: 'gemini-3.5-flash-lite',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'usr' },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'Board', schema: {} },
        },
      })
      .expect(200);

    expect(res.body.choices[0].message.content).toBe('{"nodes": []}');
    expect(res.body.usage.prompt_tokens).toBe(10);
  });

  it('rejects oversized request body (> 256 KiB) with 413 Payload Too Large', async () => {
    const hugePayload = {
      model: 'gemini-3.5-flash-lite',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'a'.repeat(260 * 1024) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'Board', schema: {} },
      },
    };

    await request(app.getHttpServer())
      .post('/dev-tools/grip/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send(hugePayload)
      .expect(413);
  });

  it('allows portal routes to accept payloads up to 10 MiB', async () => {
    const largePortalPayload = { data: 'x'.repeat(300 * 1024) };

    await request(app.getHttpServer())
      .post('/portal-fixture/large-data')
      .set('Authorization', 'Bearer valid-student-token')
      .send(largePortalPayload)
      .expect(HttpStatus.CREATED);
  });

  it('revokes current session with 204 No Content', async () => {
    await request(app.getHttpServer())
      .delete('/dev-tools/grip/sessions/current')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(204);

    expect(mockStorage.revokeSession).toHaveBeenCalled();
  });

  it('returns 404 when gateway is disabled', async () => {
    const prevEnabled = process.env.GRIP_GATEWAY_ENABLED;

    process.env.GRIP_GATEWAY_ENABLED = 'false';

    try {
      await request(app.getHttpServer())
        .post('/dev-tools/grip/sessions')
        .expect(404);
    } finally {
      process.env.GRIP_GATEWAY_ENABLED = prevEnabled;
    }
  });

  it('returns 503 when gateway is enabled but misconfigured', async () => {
    const prevModel = process.env.GRIP_GEMINI_MODEL;

    delete process.env.GRIP_GEMINI_MODEL;

    try {
      await request(app.getHttpServer())
        .post('/dev-tools/grip/sessions')
        .expect(503);
    } finally {
      process.env.GRIP_GEMINI_MODEL = prevModel;
    }
  });
});
