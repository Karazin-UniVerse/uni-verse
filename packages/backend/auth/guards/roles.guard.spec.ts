import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@universe/database';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockPrisma: { user: { findUnique: jest.Mock } };

  const createExecutionContext = (user?: Record<string, unknown>) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    guard = new RolesGuard(reflector, mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow access when no roles metadata is defined', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const allowed = await guard.canActivate(createExecutionContext());

    expect(allowed).toBe(true);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should deny access when authenticated user sub is missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    await expect(guard.canActivate(createExecutionContext({}))).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should deny access when user is not found in database', async () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);

    mockPrisma.user.findUnique.mockResolvedValue(null);

    const context = createExecutionContext({ sub: 'user-1' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(spy).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('should verify roles against database rather than stale JWT claims', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    mockPrisma.user.findUnique.mockResolvedValue({
      roles: [Role.MOODLE_STUDENT],
    });

    const context = createExecutionContext({
      sub: 'user-1',
      roles: [Role.ADMIN],
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { roles: true },
    });
  });

  it('should allow access when database user holds a required role', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    mockPrisma.user.findUnique.mockResolvedValue({
      roles: [Role.OPPORTUNITIES_USER, Role.ADMIN],
    });

    const allowed = await guard.canActivate(
      createExecutionContext({ sub: 'admin-1' }),
    );

    expect(allowed).toBe(true);
  });
});
