import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UserController (HTTP Integration / E2E)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let authToken: string;

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
          for (const u of mockUsers.values()) {
            if (u.email === where.email) {
              return u;
            }
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    jwtService = moduleFixture.get(JwtService);
    authToken = await jwtService.signAsync(
      { sub: 'test-admin', email: 'admin@karazin.ua' },
      { secret: process.env.AT_SECRET },
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    mockUsers.clear();
  });

  describe('GET /user', () => {
    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer()).get('/user').expect(401);
    });

    it('should return empty list when no users exist', async () => {
      const res = await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should return list of users with sensitive fields stripped', async () => {
      mockUsers.set('u1', {
        id: 'u1',
        email: 'user1@karazin.ua',
        name: 'User One',
        role: 'STUDENT',
        password: 'hashed-secret-pwd',
        token: 'sensitive-moodle-token',
        refreshToken: 'sensitive-refresh-token',
        moodleId: 'm1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].email).toBe('user1@karazin.ua');
      expect(res.body[0].password).toBeUndefined();
      expect(res.body[0].token).toBeUndefined();
      expect(res.body[0].refreshToken).toBeUndefined();
    });
  });

  describe('POST /user', () => {
    it('should reject unauthenticated creation with 401', async () => {
      await request(app.getHttpServer())
        .post('/user')
        .send({ email: 'new@karazin.ua', password: 'Password123' })
        .expect(401);
    });

    it('should create new user with hashed password and return sanitized user', async () => {
      const res = await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'created@karazin.ua',
          name: 'Created User',
          password: 'PlainPassword123!',
          token: 'moodle-tok-123',
          moodleId: 'moodle-id-999',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('created@karazin.ua');
      expect(res.body.name).toBe('Created User');
      expect(res.body.password).toBeUndefined();

      // Check stored password in mock database is hashed
      const stored = mockUsers.get(res.body.id);

      expect(stored).toBeDefined();
      expect(stored.password).not.toBe('PlainPassword123!');
      expect(stored.password.startsWith('$2')).toBe(true);
    });

    it('should reject user creation when required email is missing or invalid', async () => {
      await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Only Name Provided',
        })
        .expect(400);
    });
  });

  describe('PATCH /user/:id and DELETE /user/:id', () => {
    it('should update user and return sanitized object', async () => {
      mockUsers.set('u-target', {
        id: 'u-target',
        email: 'target@karazin.ua',
        name: 'Target User',
        role: 'STUDENT',
        moodleId: 'initial-moodle-id',
        password: 'hashed-password',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .patch('/user/u-target')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ moodleId: 'updated-moodle-id' })
        .expect(200);

      expect(res.body.moodleId).toBe('updated-moodle-id');
      expect(res.body.password).toBeUndefined();
    });

    it('should delete existing user with 200', async () => {
      mockUsers.set('u-del', {
        id: 'u-del',
        email: 'del@karazin.ua',
        name: 'To Delete',
        role: 'STUDENT',
        password: 'hashed-password',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .delete('/user/u-del')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe('u-del');
      expect(mockUsers.has('u-del')).toBe(false);
    });
  });
});
