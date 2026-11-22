import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { AtStrategy } from '../../auth/strategies/at.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { MoodleCoursesService } from '../moodle-courses/moodle-courses.service';

interface MockUserRecord {
  id: string;
  email: string;
  roles: string[];
  token: string | null;
  moodleId: string | null;
}

describe('MoodleCredentialsGuard HTTP pipeline', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let atStrategy: AtStrategy;

  const originalEnv: Record<string, string | undefined> = {};
  const mockUsers = new Map<string, MockUserRecord>();

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn(
        async ({ where }: { where: { id?: string } }) =>
          (where.id ? mockUsers.get(where.id) : null) ?? null,
      ),
    },
  };

  const mockMoodleCoursesService = {
    getCourses: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    for (const key of ['AT_SECRET', 'RT_SECRET', 'MOODLE_BASEURL']) {
      originalEnv[key] = process.env[key];
    }

    process.env.AT_SECRET = 'moodle-http-test-at-secret-key-1234567890';
    process.env.RT_SECRET = 'moodle-http-test-rt-secret-key-1234567890';
    process.env.MOODLE_BASEURL = 'https://moodle.karazin.ua';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(MoodleCoursesService)
      .useValue(mockMoodleCoursesService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    jwtService = moduleFixture.get(JwtService);
    atStrategy = moduleFixture.get(AtStrategy);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsers.clear();
    mockUsers.set('linked-student', {
      id: 'linked-student',
      email: 'linked@karazin.ua',
      roles: ['MOODLE_STUDENT'],
      token: 'db-moodle-token',
      moodleId: '4021',
    });
    mockUsers.set('unlinked-student', {
      id: 'unlinked-student',
      email: 'unlinked@karazin.ua',
      roles: ['OPPORTUNITIES_USER'],
      token: null,
      moodleId: null,
    });
  });

  it('rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer()).get('/moodle/courses').expect(401);

    expect(mockMoodleCoursesService.getCourses).not.toHaveBeenCalled();
  });

  it('resolves DB Moodle credentials once through global AtGuard and MoodleCredentialsGuard', async () => {
    const validateSpy = jest.spyOn(atStrategy, 'validate');
    const token = await jwtService.signAsync(
      {
        sub: 'linked-student',
        email: 'linked@karazin.ua',
        roles: ['MOODLE_STUDENT'],
      },
      { secret: process.env.AT_SECRET },
    );

    await request(app.getHttpServer())
      .get('/moodle/courses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(validateSpy).toHaveBeenCalledTimes(1);
    expect(mockMoodleCoursesService.getCourses).toHaveBeenCalledWith(
      'db-moodle-token',
      '4021',
    );
  });

  it('strips spoofed legacy Moodle claims in JWT and injects DB credentials', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'linked-student',
        email: 'linked@karazin.ua',
        roles: ['MOODLE_STUDENT'],
        moodleToken: 'spoofed-jwt-token',
        moodleId: '99999',
      },
      { secret: process.env.AT_SECRET },
    );

    await request(app.getHttpServer())
      .get('/moodle/courses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mockMoodleCoursesService.getCourses).toHaveBeenCalledWith(
      'db-moodle-token',
      '4021',
    );
  });

  it('returns 400 when authenticated user has no linked Moodle account', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'unlinked-student',
        email: 'unlinked@karazin.ua',
        roles: ['OPPORTUNITIES_USER'],
      },
      { secret: process.env.AT_SECRET },
    );

    await request(app.getHttpServer())
      .get('/moodle/courses')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(mockMoodleCoursesService.getCourses).not.toHaveBeenCalled();
  });

  it('returns 401 when user record no longer exists in database', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'deleted-student',
        email: 'deleted@karazin.ua',
        roles: ['MOODLE_STUDENT'],
      },
      { secret: process.env.AT_SECRET },
    );

    await request(app.getHttpServer())
      .get('/moodle/courses')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(mockMoodleCoursesService.getCourses).not.toHaveBeenCalled();
  });
});
