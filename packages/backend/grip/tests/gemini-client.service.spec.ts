import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { GripCompletionRequest } from '@universe/core/types/grip';
import { GeminiClientService } from '../gemini-client.service';
import type { GripConfig } from '../grip.types';

describe('GeminiClientService', () => {
  let service: GeminiClientService;
  const mockConfig: GripConfig = {
    enabled: true,
    geminiApiKey: 'secret-gemini-key',
    geminiModel: 'gemini-3.5-flash-lite',
    geminiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    githubApiUrl: 'https://api.github.com',
    githubOAuthClientId: 'client-id',
    githubPermissionToken: 'server-pat',
    githubOwner: 'Karazin-UniVerse',
    githubRepository: 'uni-verse',
    trustedProxyAddresses: [],
  };

  const validRequest: GripCompletionRequest = {
    model: 'gemini-3.5-flash-lite',
    messages: [
      { role: 'system', content: 'system message' },
      { role: 'user', content: 'user message' },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'Board',
        schema: { type: 'object' },
      },
    },
  };

  beforeEach(() => {
    service = new GeminiClientService(mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('proxies to exact fixed host/model with Authorization substitution and caps max_tokens at 8192', async () => {
    let capturedUrl: string | undefined;
    let capturedOptions: RequestInit | undefined;

    const mockResponsePayload = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: '{"nodes": []}',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 15,
        completion_tokens: 25,
        total_tokens: 40,
      },
      extra_upstream_field: 'should_not_leak',
    };

    jest.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      capturedUrl = String(url);
      capturedOptions = init;

      return new Response(JSON.stringify(mockResponsePayload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const result = await service.complete(validRequest);

    expect(capturedUrl).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    );
    expect(capturedOptions?.method).toBe('POST');
    expect(
      (capturedOptions?.headers as Record<string, string>)?.Authorization,
    ).toBe('Bearer secret-gemini-key');

    const body = JSON.parse(String(capturedOptions?.body));

    expect(body.model).toBe('gemini-3.5-flash-lite');
    expect(body.max_tokens).toBe(8192);

    expect(result.choices[0].message.content).toBe('{"nodes": []}');
    expect(result.usage).toEqual({
      prompt_tokens: 15,
      completion_tokens: 25,
      total_tokens: 40,
    });
    expect((result as any).extra_upstream_field).toBeUndefined();
  });

  it('maps 429 quota errors to 429 HttpException without exposing upstream body', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('RESOURCE_EXHAUSTED: quota exceeded', {
        status: 429,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    await expect(service.complete(validRequest)).rejects.toThrow(
      new HttpException(
        'Upstream quota exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  });

  it('maps 401/403 to sanitized 503 without leaking api key or provider message', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('API key invalid: secret-gemini-key', {
        status: 401,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    try {
      await service.complete(validRequest);
      fail('Expected exception');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const message = (error as Error).message;

      expect(message).not.toContain('secret-gemini-key');
      expect(message).toBe('Upstream model service unavailable');
    }
  });

  it('maps 500/502/503 and malformed choices/JSON to BadGatewayException (502)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Internal server error', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    await expect(service.complete(validRequest)).rejects.toThrow(
      BadGatewayException,
    );

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('not a json', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(service.complete(validRequest)).rejects.toThrow(
      BadGatewayException,
    );

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(service.complete(validRequest)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('aborts streaming and rejects when upstream responses exceed 2 MiB', async () => {
    let cancelledWithReason: string | undefined;
    const chunk = new Uint8Array(1024 * 1024); // 1 MiB chunk

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.enqueue(chunk); // 3 MiB total
      },
      cancel(reason) {
        cancelledWithReason = String(reason);
      },
    });

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(service.complete(validRequest)).rejects.toThrow(
      new BadGatewayException('Upstream response exceeded size limit'),
    );

    expect(cancelledWithReason).toBe('Upstream response exceeded size limit');
  });

  it('maps timeout during stream read to GatewayTimeoutException (504)', async () => {
    const stream = new ReadableStream({
      pull() {
        const timeoutErr = new Error('The operation was aborted');

        timeoutErr.name = 'TimeoutError';
        throw timeoutErr;
      },
    });

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(service.complete(validRequest)).rejects.toThrow(
      GatewayTimeoutException,
    );
  });

  it('maps connection timeout / deadline abort to GatewayTimeoutException (504)', async () => {
    const timeoutError = new Error('The operation was aborted');

    timeoutError.name = 'TimeoutError';
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(timeoutError);

    await expect(service.complete(validRequest)).rejects.toThrow(
      GatewayTimeoutException,
    );
  });

  it.each([401, 403, 429])(
    'cancels an unread upstream error body for HTTP %s',
    async (status) => {
      let cancelled = false;
      const stream = new ReadableStream<Uint8Array>({
        cancel() {
          cancelled = true;
        },
      });

      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response(stream, { status }));

      await expect(service.complete(validRequest)).rejects.toThrow(
        HttpException,
      );
      expect(cancelled).toBe(true);
    },
  );
});
