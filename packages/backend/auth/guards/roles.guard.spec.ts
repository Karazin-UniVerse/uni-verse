import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@universe/database';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

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
    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should allow access when no roles metadata is defined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(createExecutionContext())).toBe(true);
  });

  it('should allow access when required roles array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    expect(guard.canActivate(createExecutionContext())).toBe(true);
  });

  it('should deny access when authenticated user sub is missing or empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(createExecutionContext())).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(createExecutionContext({}))).toThrow(
      ForbiddenException,
    );
    expect(() =>
      guard.canActivate(createExecutionContext({ sub: 123 })),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(createExecutionContext({ sub: '' })),
    ).toThrow(ForbiddenException);
  });

  it('should deny access when the user has no roles', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);
    const context = createExecutionContext({ sub: 'user-1' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(spy).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('should deny access when the user lacks every required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          sub: 'user-1',
          roles: [Role.MOODLE_STUDENT],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should allow access when the user holds a required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    expect(
      guard.canActivate(
        createExecutionContext({
          sub: 'admin-1',
          roles: [Role.OPPORTUNITIES_USER, Role.ADMIN],
        }),
      ),
    ).toBe(true);
  });
});
