import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { GripCompletionRequest } from '@universe/core/types/grip';
import { GeminiClientService } from './gemini-client.service';
import type { GripConfig } from './grip.types';

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

      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify(mockResponsePayload),
      } as unknown as Response;
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
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'RESOURCE_EXHAUSTED: quota exceeded',
    } as unknown as Response);

    await expect(service.complete(validRequest)).rejects.toThrow(
      new HttpException(
        'Upstream quota exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  });

  it('maps 401/403 to sanitized 503 without leaking api key or provider message', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'API key invalid: secret-gemini-key',
    } as unknown as Response);

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
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal server error',
    } as unknown as Response);

    await expect(service.complete(validRequest)).rejects.toThrow(
      BadGatewayException,
    );

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'not a json',
    } as unknown as Response);

    await expect(service.complete(validRequest)).rejects.toThrow(
      BadGatewayException,
    );

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [] }),
    } as unknown as Response);

    await expect(service.complete(validRequest)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('rejects upstream responses exceeding 2 MiB', async () => {
    const hugeBody = 'a'.repeat(2 * 1024 * 1024 + 10);

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => hugeBody,
    } as unknown as Response);

    await expect(service.complete(validRequest)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('maps timeout / deadline abort to GatewayTimeoutException (504)', async () => {
    const timeoutError = new Error('The operation was aborted');

    timeoutError.name = 'TimeoutError';
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(timeoutError);

    await expect(service.complete(validRequest)).rejects.toThrow(
      GatewayTimeoutException,
    );
  });
});
