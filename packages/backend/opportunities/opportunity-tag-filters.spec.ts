import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import request from 'supertest';
import { OpportunityTag } from '@universe/database';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

describe('opportunity tag filter HTTP contract', () => {
  let app: INestApplication;
  const findMany = jest.fn().mockResolvedValue([]);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OpportunitiesController],
      providers: [
        OpportunitiesService,
        { provide: PrismaService, useValue: { opportunity: { findMany } } },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(() => {
    findMany.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    { query: 'tags=IT', tags: ['IT'] },
    { query: 'tags=IT&tags=REMOTE', tags: ['IT', 'REMOTE'] },
  ])(
    'should filter by any of the given tags: $query',
    async ({ query, tags }) => {
      await request(app.getHttpServer())
        .get(`/opportunities?${query}`)
        .expect(200, []);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PUBLISHED', tags: { hasSome: tags } },
        }),
      );
    },
  );

  it.each(['tags=react', 'tags=&tags=IT'])(
    'should reject tags outside the predefined list: %s',
    async (query) => {
      await request(app.getHttpServer())
        .get(`/opportunities?${query}`)
        .expect(400);

      expect(findMany).not.toHaveBeenCalled();
    },
  );

  it('should document exploded form parameters instead of comma-separated values', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const parameters = document.paths['/opportunities'].get?.parameters;

    expect(parameters).toContainEqual(
      expect.objectContaining({
        name: 'tags',
        in: 'query',
        style: 'form',
        explode: true,
        schema: {
          type: 'array',
          items: { type: 'string', enum: Object.values(OpportunityTag) },
        },
      }),
    );
  });
});
