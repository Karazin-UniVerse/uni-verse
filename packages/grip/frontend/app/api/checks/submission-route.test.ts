import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GripServerClient } from '@grip/services/grip-server-client';
import { POST } from './[checkId]/submissions/route';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'opaque-session' }) }),
}));
const url = 'https://portal.example/dev-tools/grip/api/checks/test/submissions';
const params = { params: Promise.resolve({ checkId: 'a'.repeat(43) }) };

describe('hosted submission BFF boundary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('GRIP_BACKEND_ORIGIN', 'https://backend.example');
    vi.stubEnv('GRIP_HOSTED_FRONTEND_ORIGIN', 'https://portal.example');
  });

  it('should reject a wrong origin before reading the body or dispatching', async () => {
    const request = new Request(url, { method: 'POST', body: '{}' });

    request.headers.set('origin', 'https://evil.example');
    request.headers.set('x-grip-csrf', 'c'.repeat(43));
    const body = vi.spyOn(request, 'json');
    const call = vi.spyOn(GripServerClient.prototype, 'submit');
    const response = await POST(request, params);

    expect(response.status).toBe(403);
    expect(body).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });

  it('should reject a mutation without a session-bound CSRF-shaped header', async () => {
    const request = new Request(url, { method: 'POST', body: '{}' });

    request.headers.set('origin', 'https://portal.example');
    expect((await POST(request, params)).status).toBe(403);
  });

  it('should bound actual streamed bytes even without Content-Length', async () => {
    const call = vi.spyOn(GripServerClient.prototype, 'submit');
    const request = new Request(url, {
      method: 'POST',
      body: JSON.stringify({ answer: 'x'.repeat(256 * 1024) }),
    });

    request.headers.set('origin', 'https://portal.example');
    request.headers.set('x-grip-csrf', 'c'.repeat(43));

    expect(request.headers.get('origin')).toBe('https://portal.example');
    const response = await POST(request, params);

    expect(response.status).toBe(413);
    expect(call).not.toHaveBeenCalled();
  });

  it('should forward a valid same-origin submission once after bounded parsing', async () => {
    const call = vi
      .spyOn(GripServerClient.prototype, 'submit')
      .mockResolvedValue({ status: 200, body: { state: 'PASSED' } } as never);
    const input = { requestId: 'a'.repeat(16), boardRevision: 'b'.repeat(64), answers: [] };
    const request = new Request(url, { method: 'POST', body: JSON.stringify(input) });

    request.headers.set('origin', 'https://portal.example');
    request.headers.set('x-grip-csrf', 'c'.repeat(43));
    const response = await POST(request, params);

    expect(response.status).toBe(200);
    expect(call).toHaveBeenCalledOnce();
    expect(call).toHaveBeenCalledWith(
      expect.objectContaining({ input, origin: 'https://portal.example' }),
    );
  });

  it('should preserve quota and pending status without exposing upstream headers', async () => {
    vi.spyOn(GripServerClient.prototype, 'submit').mockResolvedValue({
      status: 429,
      body: { state: 'QUOTA_REJECTED' },
    } as never);
    const request = new Request(url, { method: 'POST', body: '{}' });

    request.headers.set('origin', 'https://portal.example');
    request.headers.set('x-grip-csrf', 'c'.repeat(43));
    const response = await POST(request, params);

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ state: 'QUOTA_REJECTED' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
