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
});
