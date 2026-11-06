import { afterEach, describe, expect, it, vi } from 'vitest';
import { GripServerClient } from './grip-server-client';

describe('GripServerClient', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should forward only a dedicated session credential to a fixed backend route', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ githubId: '123' }));
    const client = new GripServerClient('https://backend.example');

    await client.session('opaque');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://backend.example/dev-tools/grip/browser/session',
      expect.objectContaining({
        redirect: 'error',
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'GripBrowser opaque' }),
      }),
    );
    expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).has('Cookie')).toBe(false);
  });

  it('should reject path traversal in check identifiers before a network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const client = new GripServerClient('https://backend.example');

    await expect(client.view('opaque', '../sessions')).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should reject insecure or credential-bearing backend origins', () => {
    expect(() => new GripServerClient('http://external.example')).toThrow();
    expect(() => new GripServerClient('https://user:secret@backend.example')).toThrow();
    expect(() => new GripServerClient('https://backend.example/path')).toThrow();
  });

  it('should preserve Retry-After without forwarding arbitrary backend headers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 429, headers: { 'Retry-After': '7', 'X-Private': 'secret' } }),
    );

    await expect(
      new GripServerClient('https://backend.example').session('opaque'),
    ).rejects.toMatchObject({ status: 429, retryAfter: 7 });
  });

  it('should retain pending and quota HTTP status for BFF operation responses', async () => {
    const body = {
      checkId: 'a'.repeat(43),
      state: 'QUOTA_REJECTED',
      reason: 'PROVIDER_QUOTA',
      bindingDigest: 'd'.repeat(64),
      expiresAt: '2026-11-07T00:00:00Z',
      passValidUntil: '2026-11-07T00:00:00Z',
      policyVersion: 'hosted-v1',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body, { status: 429 }));
    await expect(
      new GripServerClient('https://backend.example').submit({
        token: 'opaque',
        checkId: body.checkId,
        input: { requestId: 'a'.repeat(16), boardRevision: 'b'.repeat(64), answers: [] },
        origin: 'https://portal.example',
        csrfToken: 'csrf',
      }),
    ).resolves.toMatchObject({ status: 429, body });
  });

  it('should never expose extra backend status fields in an operation result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        checkId: 'a'.repeat(43),
        state: 'PASSED',
        bindingDigest: 'd'.repeat(64),
        expiresAt: '2026-11-07T00:00:00Z',
        passValidUntil: '2026-11-07T00:00:00Z',
        policyVersion: 'hosted-v1',
        secret: 'SHOULD_NOT_LEAK',
      }),
    );
    const result = await new GripServerClient('https://backend.example').submit({
      token: 'opaque',
      checkId: 'a'.repeat(43),
      input: { requestId: 'a'.repeat(16), boardRevision: 'b'.repeat(64), answers: [] },
      origin: 'https://portal.example',
      csrfToken: 'csrf',
    });

    expect(JSON.stringify(result)).not.toContain('SHOULD_NOT_LEAK');
  });

  it('should reject a quota body bound to a different check instead of forwarding it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ checkId: 'z'.repeat(43), state: 'QUOTA_REJECTED' }, { status: 429 }),
    );

    await expect(
      new GripServerClient('https://backend.example').submit({
        token: 'opaque',
        checkId: 'a'.repeat(43),
        input: { requestId: 'a'.repeat(16), boardRevision: 'b'.repeat(64), answers: [] },
        origin: 'https://portal.example',
        csrfToken: 'csrf',
      }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('should reject malformed operation states at the BFF boundary', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        checkId: 'a'.repeat(43),
        state: 'UNKNOWN',
        bindingDigest: 'd'.repeat(64),
        expiresAt: '2026-11-07T00:00:00Z',
        passValidUntil: '2026-11-07T00:00:00Z',
        policyVersion: 'hosted-v1',
      }),
    );

    await expect(
      new GripServerClient('https://backend.example').submit({
        token: 'opaque',
        checkId: 'a'.repeat(43),
        input: { requestId: 'a'.repeat(16), boardRevision: 'b'.repeat(64), answers: [] },
        origin: 'https://portal.example',
        csrfToken: 'csrf',
      }),
    ).rejects.toThrow('Invalid hosted Grip status');
  });
});
