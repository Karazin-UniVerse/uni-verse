import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { GetCreds } from '../src/utils/get-creds';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (HTTP Integration / E2E)', () => {
  let app: INestApplication<App>;

  const mockUsers = new Map<string, any>();

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findMany: jest
        .fn()
        .mockImplementation(async () => Array.from(mockUsers.values())),
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id) {
          return mockUsers.get(where.id) ?? null;
        }

        if (where.email) {
          for (const user of mockUsers.values()) {
            if (user.email === where.email) {
              return user;
            }
          }
        }

        return null;
      }),
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        for (const user of mockUsers.values()) {
          if (where.moodleId && user.moodleId === where.moodleId) {
            return user;
          }
        }

        return null;
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const id =
          data.id ||
          `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const user = {
          id,
          name: null,
          role: 'STUDENT',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
          refreshToken: data.refreshToken ?? null,
        };

        mockUsers.set(id, user);

        return user;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const existing = mockUsers.get(where.id);

        if (!existing) {
          throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        }

        const updated = { ...existing, ...data, updatedAt: new Date() };

        mockUsers.set(where.id, updated);

        return updated;
      }),
      delete: jest.fn().mockImplementation(async ({ where }) => {
        const existing = mockUsers.get(where.id);

        if (!existing) {
          throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        }

        mockUsers.delete(where.id);

        return existing;
      }),
    },
  };

  const mockGetCreds = {
    getBaseUrl: jest.fn().mockReturnValue('https://moodle.karazin.ua'),
    getToken: jest
      .fn()
      .mockImplementation(async (email: string, password: string) => {
        if (password === 'invalid-creds') {
          throw new Error('Invalid credentials');
        }

        return `token-${email}`;
      }),
    getUserId: jest.fn().mockImplementation(async (token: string) => {
      return `moodle-id-${token.slice(0, 8)}`;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(GetCreds)
      .useValue(mockGetCreds)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    mockUsers.clear();
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user and set refreshToken cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newstudent@karazin.ua',
          password: 'ValidPassword123!',
        })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');

      const cookies = res.headers['set-cookie'] as unknown as
        string[] | undefined;

      expect(cookies).toBeDefined();
      expect(
        cookies?.some((cookie) => cookie.startsWith('refreshToken=')),
      ).toBe(true);
    });

    it('should reject registration when email format is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'ValidPassword123!',
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should reject duplicate registration for existing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@karazin.ua',
          password: 'ValidPassword123!',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@karazin.ua',
          password: 'ValidPassword123!',
        })
        .expect(400);

      expect(res.body.message).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should log in existing user and return access_token with cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'loginuser@karazin.ua',
          password: 'ValidPassword123!',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'loginuser@karazin.ua',
          password: 'ValidPassword123!',
        })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');

      const cookies = res.headers['set-cookie'] as unknown as
        string[] | undefined;

      expect(
        cookies?.some((cookie) => cookie.startsWith('refreshToken=')),
      ).toBe(true);
    });

    it('should reject login if credentials fail validation with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'badcreds@karazin.ua',
          password: 'invalid-creds',
        })
        .expect(403);

      expect(res.status).toBe(403);
    });

    it('should reject login if payload is malformed with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: '',
          password: '',
        })
        .expect(400);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/refresh and POST /auth/logout flow', () => {
    it('should perform full token refresh and logout lifecycle', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'sessionuser@karazin.ua',
          password: 'ValidPassword123!',
        })
        .expect(201);

      expect(registerRes.body.access_token).toBeDefined();
      const rawCookies = registerRes.headers[
        'set-cookie'
      ] as unknown as string[];
      const refreshCookie = rawCookies.find((cookie) =>
        cookie.startsWith('refreshToken='),
      );

      expect(refreshCookie).toBeDefined();

      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie!])
        .expect(200);

      expect(refreshRes.body).toHaveProperty('access_token');
      expect(typeof refreshRes.body.access_token).toBe('string');

      const newAccessToken = refreshRes.body.access_token;

      // Logout with the refreshed access token
      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(logoutRes.body.message).toContain('Logged out');
    });

    it('should reject refresh without cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);

      expect(res.status).toBe(401);
    });

    it('should reject logout without Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);

      expect(res.status).toBe(401);
    });
  });
});
