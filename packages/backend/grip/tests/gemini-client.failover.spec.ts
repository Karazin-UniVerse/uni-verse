import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GeminiClientService } from '../gemini-client.service';
import { GripService } from '../grip.service';
import type { GripQuotaService } from '../grip-quota.service';
import type { GripConfig } from '../grip.types';
import type { GripCompletionRequest } from '@universe/core/types/grip';

const config: GripConfig = {
  enabled: true,
  geminiApiKeys: ['first-secret', 'second-secret', 'third-secret'],
  geminiModel: 'gemini-3.5-flash-lite',
  geminiBaseUrl: 'https://provider.example/v1',
  githubApiUrl: 'https://api.github.com',
  githubOAuthClientId: 'client',
  githubPermissionToken: 'pat',
  githubOwner: 'owner',
  githubRepository: 'repo',
  trustedProxyAddresses: [],
};
const request: GripCompletionRequest = {
  model: 'gemini-3.5-flash-lite',
  messages: [
    { role: 'system', content: 'private-system' },
    { role: 'user', content: 'private-diff' },
  ],
  response_format: {
    type: 'json_schema',
    json_schema: { name: 'Board', schema: { type: 'object' } },
  },
};

function success(): Response {
  return Response.json({
    choices: [{ message: { role: 'assistant', content: '{}' } }],
  });
}

function deferredResponse(): {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
} {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe('GeminiClientService key balancing and failover', () => {
  let service: GeminiClientService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AbortSignal, 'timeout').mockImplementation((duration) => {
      const controller = new AbortController();

      setTimeout(
        () =>
          controller.abort(
            new DOMException('Deadline exceeded', 'TimeoutError'),
          ),
        duration,
      );

      return controller.signal;
    });
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    debugSpy = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => {});
    fetchSpy = jest.spyOn(global, 'fetch');
    service = new GeminiClientService(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function bearers(): string[] {
    return fetchSpy.mock.calls.map(
      ([, options]) => new Headers(options?.headers).get('Authorization') ?? '',
    );
  }

  it('rotates healthy calls without leaking internal metadata', async () => {
    fetchSpy.mockImplementation(async () => success());

    for (let index = 0; index < 4; index += 1) {
      expect(await service.complete(request)).toEqual({
        choices: [{ message: { role: 'assistant', content: '{}' } }],
      });
    }

    expect(bearers()).toEqual([
      'Bearer first-secret',
      'Bearer second-secret',
      'Bearer third-secret',
      'Bearer first-secret',
    ]);
  });

  it('selects a different key for overlapping requests and reuses the idle key', async () => {
    service = new GeminiClientService({
      ...config,
      geminiApiKeys: config.geminiApiKeys.slice(0, 2),
    });
    const pending = deferredResponse();

    fetchSpy
      .mockImplementationOnce(() => pending.promise)
      .mockImplementation(async () => success());
    const first = service.complete(request);

    await service.complete(request);
    await service.complete(request);
    expect(bearers()).toEqual([
      'Bearer first-secret',
      'Bearer second-secret',
      'Bearer second-secret',
    ]);
    pending.resolve(success());
    await first;
    await service.complete(request);
    expect(bearers().at(-1)).toBe('Bearer first-secret');
  });

  it.each([429, 500, 502, 503, 504])(
    'retries HTTP %s with another key on the same model and safe status logs',
    async (status) => {
      const cancelled = jest.fn();

      fetchSpy
        .mockResolvedValueOnce(
          new Response(new ReadableStream({ cancel: cancelled }), { status }),
        )
        .mockImplementation(async () => success());
      const result = service.complete(request);

      await jest.advanceTimersByTimeAsync(249);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      expect((await result).choices[0].message.content).toBe('{}');
      expect(bearers()).toEqual([
        'Bearer first-secret',
        'Bearer second-secret',
      ]);
      expect(fetchSpy.mock.calls[0][0]).toBe(fetchSpy.mock.calls[1][0]);
      const firstBody = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
      const fallbackBody = JSON.parse(String(fetchSpy.mock.calls[1][1]?.body));

      expect(firstBody.model).toBe('gemini-3.5-flash-lite');
      expect(firstBody.messages).toEqual(request.messages);
      expect(firstBody.response_format).toEqual(request.response_format);
      expect(fallbackBody.model).toBe('gemini-3.5-flash-lite');
      expect(fallbackBody.messages).toEqual(firstBody.messages);
      expect(fallbackBody.response_format).toEqual(firstBody.response_format);
      expect(cancelled).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        'Grip upstream attempt',
        expect.objectContaining({
          keySlot: 1,
          attempt: 1,
          status,
          outcome: 'http_error',
          failover: true,
        }),
      );
    },
  );

  it.each(['fetch', 'read'])(
    'retries a %s transport failure without logging raw errors',
    async (phase) => {
      const error = new Error(
        'private-provider-error first-secret private-diff',
      );

      if (phase === 'fetch') {
        fetchSpy.mockRejectedValueOnce(error);
      } else {
        fetchSpy.mockResolvedValueOnce(
          new Response(
            new ReadableStream({
              pull() {
                throw error;
              },
            }),
          ),
        );
      }

      fetchSpy.mockImplementation(async () => success());
      const result = service.complete(request);

      await jest.advanceTimersByTimeAsync(250);
      await expect(result).resolves.toMatchObject({
        choices: [{ message: { content: '{}' } }],
      });
      expect(bearers()).toEqual([
        'Bearer first-secret',
        'Bearer second-secret',
      ]);
      const logs = JSON.stringify([warnSpy.mock.calls, debugSpy.mock.calls]);

      for (const secret of [
        ...config.geminiApiKeys,
        'private-provider-error',
        'private-diff',
        'private-system',
      ]) {
        expect(logs).not.toContain(secret);
      }
    },
  );

  it.each([400, 401, 403, 404, 418, 501])(
    'does not retry non-retryable HTTP %s',
    async (status) => {
      fetchSpy.mockResolvedValue(
        new Response('private-provider-body', { status }),
      );
      const result = service.complete(request);
      const rejected = expect(result).rejects.toBeInstanceOf(HttpException);

      await jest.advanceTimersByTimeAsync(1_000);
      await rejected;
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(
        'private-provider-body',
      );
    },
  );

  it.each([
    'not json',
    JSON.stringify({ choices: [] }),
    JSON.stringify({ choices: [{ message: { content: null } }] }),
    'x'.repeat(2 * 1024 * 1024 + 1),
  ])(
    'does not retry invalid or oversized successful bodies (%#)',
    async (body) => {
      fetchSpy.mockResolvedValue(new Response(body));

      await expect(service.complete(request)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    },
  );

  it('should exhaust primary keys before trying every fallback key and stop after success', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(success());
    const result = service.complete(request);
    const resolved = expect(result).resolves.toMatchObject({
      choices: [{ message: { content: '{}' } }],
    });

    await jest.advanceTimersByTimeAsync(1_250);
    await resolved;
    expect(bearers()).toEqual([
      'Bearer first-secret',
      'Bearer second-secret',
      'Bearer third-secret',
      'Bearer first-secret',
      'Bearer second-secret',
      'Bearer third-secret',
    ]);
    expect(
      fetchSpy.mock.calls.map(
        ([, options]) => JSON.parse(String(options?.body)).model,
      ),
    ).toEqual([
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite',
    ]);
    expect(
      new Set(fetchSpy.mock.calls.map(([, options]) => options?.signal)).size,
    ).toBe(1);
  });

  it('should stop after each key/model pair fails and return the last mapped error', async () => {
    fetchSpy
      .mockImplementation(async () => new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 429 }));
    const rejected = expect(service.complete(request)).rejects.toMatchObject({
      status: 429,
    });

    await jest.advanceTimersByTimeAsync(1_250);
    await rejected;
    expect(fetchSpy).toHaveBeenCalledTimes(6);
    expect(warnSpy).toHaveBeenLastCalledWith(
      'Grip upstream attempt',
      expect.objectContaining({
        attempt: 6,
        model: 'gemini-3.1-flash-lite',
        failover: false,
      }),
    );
  });

  it('should succeed on the third primary key without calling the fallback model', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(success());
    const result = service.complete(request);

    await jest.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toBeDefined();
    expect(bearers()).toEqual([
      'Bearer first-secret',
      'Bearer second-secret',
      'Bearer third-secret',
    ]);
    expect(
      fetchSpy.mock.calls.every(
        ([, options]) =>
          JSON.parse(String(options?.body)).model === 'gemini-3.5-flash-lite',
      ),
    ).toBe(true);
  });

  it('should stop model traversal when the caller cancels at the model boundary', async () => {
    const caller = new AbortController();

    fetchSpy.mockImplementation(async () => new Response('', { status: 503 }));
    const rejected = expect(
      service.complete(request, caller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    await jest.advanceTimersByTimeAsync(500);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    caller.abort();
    await jest.advanceTimersByTimeAsync(250);
    await rejected;
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('should try both models with one key and fail promptly when both pairs cool down', async () => {
    service = new GeminiClientService({
      ...config,
      geminiApiKeys: ['first-secret'],
    });
    fetchSpy.mockImplementation(async () => new Response('', { status: 503 }));

    const rejected = expect(service.complete(request)).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    await jest.advanceTimersByTimeAsync(250);
    await rejected;
    await expect(service.complete(request)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(30_000);
    fetchSpy.mockResolvedValueOnce(success());
    await expect(service.complete(request)).resolves.toBeDefined();
  });

  it('should switch models when another completion cools the remaining primary key during backoff', async () => {
    service = new GeminiClientService({
      ...config,
      geminiApiKeys: ['first-secret', 'second-secret'],
    });
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 403 }))
      .mockResolvedValueOnce(success());
    const firstResolved = expect(
      service.complete(request),
    ).resolves.toBeDefined();

    await jest.advanceTimersByTimeAsync(1);
    await expect(service.complete(request)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await jest.advanceTimersByTimeAsync(249);
    await firstResolved;
    expect(bearers()).toEqual([
      'Bearer first-secret',
      'Bearer second-secret',
      'Bearer first-secret',
    ]);
    expect(JSON.parse(String(fetchSpy.mock.calls[2][1]?.body)).model).toBe(
      'gemini-3.1-flash-lite',
    );
  });

  it('should start with fallback when all primary pairs remain in cooldown', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockImplementation(async () => success());
    const first = service.complete(request);

    await jest.advanceTimersByTimeAsync(750);
    await first;
    await service.complete(request);
    expect(fetchSpy).toHaveBeenCalledTimes(5);
    expect(JSON.parse(String(fetchSpy.mock.calls[4][1]?.body)).model).toBe(
      'gemini-3.1-flash-lite',
    );
    expect(bearers().at(-1)).toBe('Bearer second-secret');
  });

  it('should not reuse a quota-cooled key on the fallback model', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
      )
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(success());
    const result = service.complete(request);

    await jest.advanceTimersByTimeAsync(750);
    await expect(result).resolves.toBeDefined();
    expect(bearers()).toEqual([
      'Bearer first-secret',
      'Bearer second-secret',
      'Bearer third-secret',
      'Bearer second-secret',
    ]);
    expect(JSON.parse(String(fetchSpy.mock.calls[3][1]?.body)).model).toBe(
      'gemini-3.1-flash-lite',
    );
  });

  it('cancels retry backoff without dispatching a fallback', async () => {
    const caller = new AbortController();

    fetchSpy.mockResolvedValueOnce(new Response('', { status: 503 }));
    const rejected = expect(
      service.complete(request, caller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    await jest.advanceTimersByTimeAsync(1);
    caller.abort();
    await jest.advanceTimersByTimeAsync(250);
    await rejected;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('never calls upstream for a pre-aborted caller', async () => {
    const caller = new AbortController();

    caller.abort();
    await expect(
      service.complete(request, caller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects and cancels a late fetch response after caller cancellation', async () => {
    const caller = new AbortController();
    const pending = deferredResponse();
    const cancelled = jest.fn();

    fetchSpy.mockImplementationOnce(() => pending.promise);
    const rejected = expect(
      service.complete(request, caller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    caller.abort();
    pending.resolve(new Response(new ReadableStream({ cancel: cancelled })));
    await rejected;
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it.each(['caller', 'deadline'])(
    'cancels a stalled response reader on %s abort and releases its key',
    async (source) => {
      const caller = new AbortController();
      const cancelled = jest.fn();

      fetchSpy.mockResolvedValueOnce(
        new Response(new ReadableStream({ cancel: cancelled })),
      );
      const rejected = expect(
        service.complete(request, caller.signal),
      ).rejects.toBeInstanceOf(
        source === 'deadline' ? GatewayTimeoutException : DOMException,
      );

      await jest.advanceTimersByTimeAsync(1);

      if (source === 'caller') {
        caller.abort();
      } else {
        await jest.advanceTimersByTimeAsync(59_999);
      }

      await rejected;
      expect(cancelled).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      fetchSpy.mockImplementation(async () => success());
      await service.complete(request);
      await service.complete(request);
      await service.complete(request);
      expect(bearers().at(-1)).toBe('Bearer first-secret');
    },
  );

  it('limits the fallback to the remaining portion of the original 60-second deadline', async () => {
    fetchSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(new Response('', { status: 503 })), 59_000),
        ),
    );
    fetchSpy.mockImplementationOnce(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options?.signal?.addEventListener(
            'abort',
            () => reject(options.signal?.reason),
            { once: true },
          ),
        ),
    );
    const rejected = expect(service.complete(request)).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );

    await jest.advanceTimersByTimeAsync(59_249);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(750);
    await rejected;
    expect(fetchSpy.mock.calls[0][1]?.signal).toBe(
      fetchSpy.mock.calls[1][1]?.signal,
    );
  });

  it('should keep the original deadline while the last fallback key is in flight', async () => {
    fetchSpy
      .mockImplementation(
        async (_url, options) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason),
              { once: true },
            );
          }),
      )
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }));
    const rejected = expect(service.complete(request)).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );

    await jest.advanceTimersByTimeAsync(1_250);
    expect(fetchSpy).toHaveBeenCalledTimes(6);
    await jest.advanceTimersByTimeAsync(58_750);
    await rejected;
    expect(fetchSpy).toHaveBeenCalledTimes(6);
    expect(
      new Set(fetchSpy.mock.calls.map(([, options]) => options?.signal)).size,
    ).toBe(1);
  });

  it('never starts failover when the initial fetch consumes the deadline', async () => {
    fetchSpy.mockImplementationOnce(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options?.signal?.addEventListener(
            'abort',
            () => reject(options.signal?.reason),
            { once: true },
          ),
        ),
    );
    const rejected = expect(service.complete(request)).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );

    await jest.advanceTimersByTimeAsync(60_000);
    await rejected;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('aborts an in-flight fetch without retrying and makes the released key eligible again', async () => {
    const caller = new AbortController();

    fetchSpy.mockImplementationOnce(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options?.signal?.addEventListener(
            'abort',
            () => reject(options.signal?.reason),
            { once: true },
          ),
        ),
    );
    const rejected = expect(
      service.complete(request, caller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    caller.abort();
    await rejected;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockImplementation(async () => success());

    for (let index = 0; index < 3; index += 1) {
      await service.complete(request);
    }

    expect(bearers().at(-1)).toBe('Bearer first-secret');
  });

  it('returns 504 without fallback when the deadline expires during backoff', async () => {
    fetchSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(new Response('', { status: 503 })), 59_900),
        ),
    );
    const rejected = expect(service.complete(request)).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );

    await jest.advanceTimersByTimeAsync(60_000);
    await rejected;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('reserves logical quota once and releases its lease after traversing all keys and models', async () => {
    const quota = {
      reserveCompletion: jest.fn().mockResolvedValue({ leaseId: 'lease' }),
      releaseCompletion: jest.fn().mockResolvedValue(undefined),
    };
    const gateway = new GripService(
      service,
      quota as unknown as GripQuotaService,
    );

    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(success());
    const result = gateway.complete({
      request,
      principal: { githubId: '123', login: 'dev', sessionId: 'session' },
    });

    await jest.advanceTimersByTimeAsync(1_250);
    await expect(result).resolves.toBeDefined();
    expect(fetchSpy).toHaveBeenCalledTimes(6);
    expect(quota.reserveCompletion).toHaveBeenCalledTimes(1);
    expect(quota.releaseCompletion).toHaveBeenCalledTimes(1);
    expect(quota.releaseCompletion).toHaveBeenCalledWith('lease');
  });
});
