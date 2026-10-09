import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AtGuard } from './at.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('AtGuard', () => {
  let guard: AtGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new AtGuard(reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if route is marked as public', () => {
    const mockHandler = () => 'test-handler';
    const mockClass = class TestController {};
    const context = {
      getHandler: jest.fn().mockReturnValue(mockHandler),
      getClass: jest.fn().mockReturnValue(mockClass),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      mockHandler,
      mockClass,
    ]);
  });

  it('should delegate to super.canActivate if route is not public', () => {
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const superCanActivateSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalledWith(context);
  });

  it('should delegate to super.canActivate if public metadata is undefined', () => {
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const superCanActivateSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(false);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
    expect(superCanActivateSpy).toHaveBeenCalledWith(context);
  });

  it('should delegate to super.canActivate on public route if authorization header is present', () => {
    const mockHandler = () => 'test-handler';
    const mockClass = class TestController {};
    const context = {
      getHandler: jest.fn().mockReturnValue(mockHandler),
      getClass: jest.fn().mockReturnValue(mockClass),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: { authorization: 'Bearer token' },
        }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const superCanActivateSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalledWith(context);
  });

  describe('handleRequest', () => {
    it('returns user on public route if present', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const user = { id: 'u1', roles: ['STUDENT'] };
      const result = guard.handleRequest(null, user, null, context);

      expect(result).toBe(user);
    });

    it('returns undefined on public route when user is absent or error occurs', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.handleRequest(new Error('err'), null, null, context);

      expect(result).toBeUndefined();
    });

    it('returns user on protected route', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const user = { id: 'u1' };
      const result = guard.handleRequest(null, user, null, context);

      expect(result).toBe(user);
    });

    it('throws UnauthorizedException on protected route when user is absent', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.handleRequest(null, null, null, context)).toThrow();
    });

    it('throws err if err is an Error on protected route', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const error = new Error('Custom error');

      expect(() => guard.handleRequest(error, null, null, context)).toThrow(
        error,
      );
    });

    it('throws UnauthorizedException if err is not an Error instance on protected route', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() =>
        guard.handleRequest('string error', null, null, context),
      ).toThrow();
    });
  });
});
