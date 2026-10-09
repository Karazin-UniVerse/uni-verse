import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { GetUser } from './get-user.decorator';

function getParamDecoratorFactory() {
  class TestController {
    testMethod(@GetUser() _user: unknown) {}
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'testMethod',
  );
  const key = Object.keys(metadata)[0];

  return metadata[key].factory;
}

describe('GetUser Decorator', () => {
  const factory = getParamDecoratorFactory();

  const createMockContext = (user: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('should return undefined if user is not present on request', () => {
    const ctx = createMockContext(undefined);

    expect(factory(undefined, ctx)).toBeUndefined();
  });

  it('should return the full user object if no data key is provided', () => {
    const user = { id: 'user-1', roles: ['ADMIN'] };
    const ctx = createMockContext(user);

    expect(factory(undefined, ctx)).toEqual(user);
  });

  it('should return the specific property when data key is provided', () => {
    const user = { sub: 'user-1', roles: ['ADMIN'] };
    const ctx = createMockContext(user);

    expect(factory('sub', ctx)).toBe('user-1');
  });
});
