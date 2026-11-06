import { afterEach, describe, expect, it, vi } from 'vitest';
import { GripApi } from './api.grip';

describe('hosted Grip browser API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should use same-origin credentials without portal bearer tokens', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ githubId: '123' }));

    await new GripApi().session();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/dev-tools/grip/api/auth/session',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store', redirect: 'error' }),
    );
    expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).has('Authorization')).toBe(false);
  });

  it('should carry the same submission intent and CSRF value without retrying automatically', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ state: 'PASSED' }));
    const input = { requestId: 'stable-id', boardRevision: 'revision', answers: [] };

    await new GripApi().submit({ checkId: 'a'.repeat(43), input, csrfToken: 'csrf' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][1]?.body).toBe(JSON.stringify(input));
    expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).get('X-Grip-CSRF')).toBe('csrf');
  });

  it('should retain a bounded read throttle deadline', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 429, headers: { 'Retry-After': '7' } }),
    );
    const before = Date.now();

    await expect(new GripApi().session()).rejects.toMatchObject({
      status: 429,
      retryAt: expect.any(Number),
    });

    try {
      await new GripApi().session();
    } catch (error) {
      expect((error as { retryAt: number }).retryAt).toBeGreaterThanOrEqual(before + 7000);
    }
  });

  it('should not extend polling for an invalid Retry-After value', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 429, headers: { 'Retry-After': '-7' } }),
    );

    await expect(new GripApi().session()).rejects.toMatchObject({
      status: 429,
      retryAt: undefined,
    });
  });
});
