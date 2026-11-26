import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('UserController (HTTP Integration / E2E)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let adminToken: string;
  let studentToken: string;

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
          data.id || `user-${Date.now()}-${crypto.randomUUID().slice(0, 5)}`;
        const user = {
          id,
          name: null,
          roles: ['OPPORTUNITIES_USER'],
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
    adminToken = await jwtService.signAsync(
      { sub: 'test-admin', email: 'admin@karazin.ua', roles: ['ADMIN'] },
      { secret: process.env.AT_SECRET },
    );
    studentToken = await jwtService.signAsync(
      {
        sub: 'test-student',
        email: 'student@karazin.ua',
        roles: ['MOODLE_STUDENT'],
      },
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
    mockUsers.set('test-admin', {
      id: 'test-admin',
      email: 'admin@karazin.ua',
      name: 'Admin User',
      roles: ['ADMIN'],
      password: 'hashed-admin-password',
      token: null,
      refreshToken: null,
      moodleId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockUsers.set('test-student', {
      id: 'test-student',
      email: 'student@karazin.ua',
      name: 'Student User',
      roles: ['MOODLE_STUDENT'],
      password: 'hashed-student-password',
      token: 'secret-student-moodle-token',
      refreshToken: null,
      moodleId: 'initial-moodle-id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('GET /user', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app.getHttpServer()).get('/user').expect(401);

      expect(res.status).toBe(401);
    });

    it('should reject non-admin users with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(res.status).toBe(403);
    });

    it('should return list of users with sensitive fields stripped for ADMIN', async () => {
      mockUsers.set('u1', {
        id: 'u1',
        email: 'user1@karazin.ua',
        name: 'User One',
        roles: ['OPPORTUNITIES_USER'],
        password: 'hashed-secret-pwd',
        token: 'sensitive-moodle-token',
        refreshToken: 'sensitive-refresh-token',
        moodleId: 'm1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const userOne = res.body.find(
        (item: Record<string, unknown>) => item.id === 'u1',
      );

      expect(userOne).toBeDefined();
      expect(userOne.email).toBe('user1@karazin.ua');
      expect(userOne.password).toBeUndefined();
      expect(userOne.token).toBeUndefined();
      expect(userOne.refreshToken).toBeUndefined();
    });
  });

  describe('POST /user', () => {
    it('should reject unauthenticated creation with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/user')
        .send({ email: 'new@karazin.ua', password: 'Password123' })
        .expect(401);

      expect(res.status).toBe(401);
    });

    it('should reject non-admin user creation with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ email: 'new@karazin.ua', password: 'Password123' })
        .expect(403);

      expect(res.status).toBe(403);
    });

    it('should create new user with hashed password and return sanitized user for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `Bearer ${adminToken}`)
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
      const res = await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Only Name Provided',
        })
        .expect(400);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /user/:id and DELETE /user/:id', () => {
    it('should forbid updating another user profile (IDOR blocked for non-owner and admin)', async () => {
      mockUsers.set('u-target', {
        id: 'u-target',
        email: 'target@karazin.ua',
        name: 'Target User',
        roles: ['OPPORTUNITIES_USER'],
        moodleId: 'initial-moodle-id',
        password: 'hashed-password',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await request(app.getHttpServer())
        .patch('/user/u-target')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Hacked' })
        .expect(403);

      await request(app.getHttpServer())
        .patch('/user/u-target')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Cannot Overwrite' })
        .expect(403);

      expect(mockUsers.get('u-target').name).toBe('Target User');
    });

    it('should allow user to update only their own name/password and strip privileged fields', async () => {
      const res = await request(app.getHttpServer())
        .patch('/user/test-student')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Updated Self Name',
          email: 'spoofed@evil.com',
          moodleId: 'spoofed-moodle-id',
          token: 'spoofed-moodle-token',
          roles: ['ADMIN'],
        })
        .expect(200);

      expect(res.body.name).toBe('Updated Self Name');
      expect(res.body.email).toBe('student@karazin.ua');
      expect(res.body.moodleId).toBe('initial-moodle-id');
      expect(res.body.roles).toEqual(['MOODLE_STUDENT']);
      expect(res.body.password).toBeUndefined();
      expect(mockUsers.get('test-student').token).toBe(
        'secret-student-moodle-token',
      );
    });

    it('should reject null or too-short password on self PATCH with 400', async () => {
      await request(app.getHttpServer())
        .patch('/user/test-student')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ password: null })
        .expect(400);

      await request(app.getHttpServer())
        .patch('/user/test-student')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ password: '12345' })
        .expect(400);
    });

    it('should reject stale ADMIN JWT claim after DB role downgrade with 403', async () => {
      mockUsers.set('test-admin', {
        ...mockUsers.get('test-admin'),
        roles: ['OPPORTUNITIES_USER'],
      });

      await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should reject non-admin deletion with 403', async () => {
      await request(app.getHttpServer())
        .delete('/user/test-admin')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(mockUsers.has('test-admin')).toBe(true);
    });

    it('should allow ADMIN to delete existing user with 200', async () => {
      mockUsers.set('u-del', {
        id: 'u-del',
        email: 'del@karazin.ua',
        name: 'To Delete',
        roles: ['OPPORTUNITIES_USER'],
        password: 'hashed-password',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .delete('/user/u-del')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe('u-del');
      expect(mockUsers.has('u-del')).toBe(false);
    });
  });
});
