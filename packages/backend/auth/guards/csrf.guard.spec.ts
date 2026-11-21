import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;

  const createContext = (params: {
    method?: string;
    headers?: Record<string, string | undefined>;
    cookies?: Record<string, string | undefined>;
  }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: params.method ?? 'POST',
          headers: params.headers ?? {},
          cookies: params.cookies ?? {},
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new CsrfGuard();
  });

  it('should allow safe HTTP methods regardless of cookies', () => {
    expect(
      guard.canActivate(
        createContext({
          method: 'GET',
          headers: { origin: 'https://evil.example' },
          cookies: { accessToken: 'cookie-jwt' },
        }),
      ),
    ).toBe(true);
  });

  it('should reject disallowed Origin header on state-changing requests', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          method: 'POST',
          headers: { origin: 'https://evil.example' },
          cookies: { accessToken: 'cookie-jwt' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should reject disallowed Referer header when Origin is absent', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          method: 'DELETE',
          headers: { referer: 'https://evil.example/form.html' },
          cookies: { accessToken: 'cookie-jwt' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should reject cookie-authenticated state-changing request without X-Requested-With header', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          method: 'PATCH',
          headers: { origin: 'https://universemvp.tech' },
          cookies: { accessToken: 'cookie-jwt' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should allow cookie-authenticated state-changing request with allowed origin and X-Requested-With', () => {
    expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          headers: {
            origin: 'https://universemvp.tech',
            'x-requested-with': 'XMLHttpRequest',
          },
          cookies: { accessToken: 'cookie-jwt' },
        }),
      ),
    ).toBe(true);
  });

  it('should allow Bearer-authenticated API requests without X-Requested-With', () => {
    expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          headers: { authorization: 'Bearer test-token' },
          cookies: { accessToken: 'stale-cookie' },
        }),
      ),
    ).toBe(true);
  });
});
