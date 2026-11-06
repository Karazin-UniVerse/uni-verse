import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GripServerClient, GripServerError } from '@grip/services/grip-server-client';
import { GET as start } from './start/route';
import { GET as callback } from './callback/route';
import { gripError } from '../helpers';

const { jar, setCookie } = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  setCookie: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: setCookie,
  }),
}));

describe('hosted Grip OAuth BFF routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    jar.clear();
    setCookie.mockReset();
    vi.stubEnv('GRIP_BACKEND_ORIGIN', 'https://backend.example');
  });

  it('should reject caller-selected redirect paths before contacting the backend', async () => {
    const call = vi.spyOn(GripServerClient.prototype, 'start');
    const response = await start(
      new Request(
        'https://portal.example/dev-tools/grip/api/auth/start?checkId=https://evil.example',
      ),
    );

    expect(response.status).toBe(400);
    expect(call).not.toHaveBeenCalled();
  });

  it('should forward only a validated Retry-After header on throttling', async () => {
    const response = gripError(new GripServerError(429, 7));

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('7');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('should set only a dedicated HttpOnly binding and redirect to the GitHub authorization endpoint', async () => {
    vi.spyOn(GripServerClient.prototype, 'start').mockResolvedValue({
      authorizationUrl: 'https://github.com/login/oauth/authorize?state=opaque',
    });
    const response = await start(
      new Request(
        `https://portal.example/dev-tools/grip/api/auth/start?checkId=${'a'.repeat(43)}`,
        { headers: { Authorization: 'Bearer portal-token', Cookie: 'refreshToken=portal-cookie' } },
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(setCookie).toHaveBeenCalledWith(
      'grip_oauth_binding',
      expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/dev-tools/grip',
        maxAge: 600,
      }),
    );
    expect(GripServerClient.prototype.start).toHaveBeenCalledWith({
      browserBinding: expect.any(String),
      returnCheckId: 'a'.repeat(43),
    });
  });

  it('should sanitize OAuth start outages instead of throwing a backend error into framework logs', async () => {
    vi.spyOn(GripServerClient.prototype, 'start').mockRejectedValue(
      new Error('private upstream details'),
    );
    const response = await start(
      new Request(`https://portal.example/dev-tools/grip/api/auth/start?checkId=${'a'.repeat(43)}`),
    );

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('private upstream details');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('should reject credential-bearing GitHub redirects', async () => {
    vi.spyOn(GripServerClient.prototype, 'start').mockResolvedValue({
      authorizationUrl: 'https://user:secret@github.com/login/oauth/authorize',
    });
    const response = await start(
      new Request(`https://portal.example/dev-tools/grip/api/auth/start?checkId=${'a'.repeat(43)}`),
    );

    expect(response.status).toBe(502);
    expect(setCookie).not.toHaveBeenCalled();
  });

  it('should consume the browser binding, set a host-only opaque session and never emit the secret in JSON', async () => {
    jar.set('grip_oauth_binding', 'binding');
    jar.set('grip_browser', 'p'.repeat(43));
    vi.spyOn(GripServerClient.prototype, 'callback').mockResolvedValue({
      token: 't'.repeat(43),
      returnCheckId: 'a'.repeat(43),
      identity: {
        githubId: '123',
        login: 'developer',
        expiresAt: new Date().toISOString(),
        csrfToken: 'csrf',
      },
    });
    const response = await callback(
      new Request(
        'https://portal.example/dev-tools/grip/api/auth/callback?code=private-code&state=private-state',
      ),
    );

    expect(response.status).toBe(303);
    expect(GripServerClient.prototype.callback).toHaveBeenCalledWith(
      expect.objectContaining({ previousSession: 'p'.repeat(43) }),
    );
    expect(response.headers.get('location')).toBe(
      `/dev-tools/grip/boards/${'a'.repeat(43)}?sessionChanged=1`,
    );
    expect(setCookie).toHaveBeenCalledWith(
      'grip_oauth_binding',
      '',
      expect.objectContaining({ maxAge: 0 }),
    );
    expect(setCookie).toHaveBeenCalledWith(
      'grip_browser',
      't'.repeat(43),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/dev-tools/grip',
        maxAge: 3600,
      }),
    );
    expect(await response.text()).toBe('');
  });

  it('should reject a callback without the initiating browser cookie', async () => {
    const call = vi.spyOn(GripServerClient.prototype, 'callback');
    const response = await callback(
      new Request(
        'https://portal.example/dev-tools/grip/api/auth/callback?code=private-code&state=private-state',
      ),
    );

    expect(response.status).toBe(401);
    expect(call).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain('private-code');
  });
});
