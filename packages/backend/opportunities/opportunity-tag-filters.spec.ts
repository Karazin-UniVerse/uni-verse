import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import request from 'supertest';
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
    { query: 'tags=Research%2CDesign', names: ['research,design'] },
    {
      query: 'tags=Research%2CDesign&tags=React&tags=react',
      names: ['research,design', 'react'],
    },
  ])(
    'should preserve whole tag names through HTTP parsing: $query',
    async ({ query, names }) => {
      await request(app.getHttpServer())
        .get(`/opportunities?${query}`)
        .expect(200, []);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PUBLISHED',
            tags: { some: { name: { in: names } } },
          },
        }),
      );
    },
  );

  it('should omit the tag predicate for repeated empty parameters', async () => {
    await request(app.getHttpServer())
      .get('/opportunities?tags=&tags=')
      .expect(200, []);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PUBLISHED' } }),
    );
  });

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
        schema: { type: 'array', items: { type: 'string' } },
      }),
    );
  });
});
