import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@universe/database';
import type { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

const studentId = '00000000-0000-4000-8000-000000000001';
const groupId = '00000000-0000-4000-8000-000000000002';
const subgroupId = '00000000-0000-4000-8000-000000000003';

describe('academic membership HTTP contract', () => {
  let app: INestApplication;
  let roles: Role[];
  const update = jest.fn();
  const path = `/user/${studentId}/academic-membership`;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        { provide: PrismaService, useValue: { user: { update } } },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      Object.assign(req, { user: { roles } });
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  beforeEach(() => {
    update.mockReset();
    roles = [Role.ADMIN];
  });
  afterAll(() => app.close());

  it('assigns the group and its subgroup together', async () => {
    await request(app.getHttpServer())
      .put(path)
      .send({ academicGroupId: groupId, academicSubgroupId: subgroupId })
      .expect(204);
    expect(update).toHaveBeenCalledWith({
      where: { id: studentId },
      data: {
        academicGroup: { connect: { id: groupId } },
        academicSubgroup: {
          connect: { id: subgroupId, academicGroupId: groupId },
        },
      },
      select: { id: true },
    });
  });

  it('clears the previous subgroup when the new group has no subgroup', async () => {
    await request(app.getHttpServer())
      .put(path)
      .send({ academicGroupId: groupId })
      .expect(204);
    expect(update.mock.calls[0][0].data.academicSubgroup).toEqual({
      disconnect: true,
    });
  });

  it('denies membership changes by ordinary users', async () => {
    roles = [Role.MOODLE_STUDENT];
    await request(app.getHttpServer())
      .put(path)
      .send({ academicGroupId: groupId })
      .expect(403);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { academicGroupId: 'invalid' },
    { academicGroupId: null, academicSubgroupId: subgroupId },
  ])('rejects incomplete membership %p', async (payload) => {
    await request(app.getHttpServer()).put(path).send(payload).expect(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('reports missing users, groups or subgroups outside the specified group', async () => {
    update.mockRejectedValueOnce(
      Object.assign(new Error('missing relation'), { code: 'P2025' }),
    );
    await request(app.getHttpServer())
      .put(path)
      .send({ academicGroupId: groupId, academicSubgroupId: subgroupId })
      .expect(404);
  });
});
