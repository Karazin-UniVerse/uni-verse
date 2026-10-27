import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { GripGuard } from './grip.guard';
import type { GripSessionService } from './grip-session.service';

describe('GripGuard', () => {
  let guard: GripGuard;
  let mockSessionService: {
    authenticate: jest.Mock;
  };

  beforeEach(() => {
    mockSessionService = {
      authenticate: jest.fn(),
    };
    guard = new GripGuard(mockSessionService as unknown as GripSessionService);
  });

  function createMockContext(headers: Record<string, string>): {
    context: ExecutionContext;
    request: any;
  } {
    const request = {
      headers,
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  it('authenticates valid Bearer token and attaches gripPrincipal to request', async () => {
    const principal = { githubId: '123', login: 'dev', sessionId: 'sess-1' };

    mockSessionService.authenticate.mockResolvedValue(principal);

    const { context, request } = createMockContext({
      authorization: 'Bearer ugr_token123',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.gripPrincipal).toEqual(principal);
    expect(request.user).toBeUndefined();
    expect(mockSessionService.authenticate).toHaveBeenCalledWith(
      'ugr_token123',
    );
  });

  it('rejects missing or non-Bearer authorization header', async () => {
    const noHeader = createMockContext({});

    await expect(guard.canActivate(noHeader.context)).rejects.toThrow(
      UnauthorizedException,
    );

    const basicAuth = createMockContext({
      authorization: 'Basic dXNlcjpwYXNz',
    });

    await expect(guard.canActivate(basicAuth.context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when session service throws UnauthorizedException', async () => {
    mockSessionService.authenticate.mockRejectedValue(
      new UnauthorizedException('Invalid token'),
    );

    const { context } = createMockContext({
      authorization: 'Bearer ugr_bad_token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
