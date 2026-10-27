import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  GripCompletionRequest,
  GripCompletionResponse,
  GripCompletionUsage,
} from '@universe/core/types/grip';
import {
  GRIP_ALLOWED_MODEL,
  GRIP_MAX_OUTPUT_TOKENS,
  GRIP_MAX_UPSTREAM_BYTES,
  GRIP_UPSTREAM_TIMEOUT_MS,
} from './grip.constants';
import { resolveGripConfig } from './grip.helpers';
import type { GripConfig } from './grip.types';

function stripTrailingSlashes(url: string): string {
  let trimmed = url;

  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed;
}

function parseUsage(usageRecord: unknown): GripCompletionUsage | undefined {
  if (!usageRecord || typeof usageRecord !== 'object') {
    return undefined;
  }

  const record = usageRecord as Record<string, unknown>;

  const promptTokens =
    Number.isSafeInteger(record.prompt_tokens) &&
    (record.prompt_tokens as number) >= 0
      ? (record.prompt_tokens as number)
      : undefined;

  const completionTokens =
    Number.isSafeInteger(record.completion_tokens) &&
    (record.completion_tokens as number) >= 0
      ? (record.completion_tokens as number)
      : undefined;

  const totalTokens =
    Number.isSafeInteger(record.total_tokens) &&
    (record.total_tokens as number) >= 0
      ? (record.total_tokens as number)
      : undefined;

  if (
    promptTokens === undefined &&
    completionTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }

  return {
    ...(promptTokens !== undefined ? { prompt_tokens: promptTokens } : {}),
    ...(completionTokens !== undefined
      ? { completion_tokens: completionTokens }
      : {}),
    ...(totalTokens !== undefined ? { total_tokens: totalTokens } : {}),
  };
}

function parseChoices(data: unknown): GripCompletionResponse['choices'] {
  const dataRecord = data as {
    choices?: Array<{
      message?: { role?: string; content?: unknown };
      index?: unknown;
      finish_reason?: unknown;
    }>;
  };

  if (!Array.isArray(dataRecord?.choices) || dataRecord.choices.length === 0) {
    throw new BadGatewayException('Missing choices in upstream model response');
  }

  const firstChoice = dataRecord.choices[0];

  if (
    !firstChoice?.message ||
    typeof firstChoice.message.content !== 'string'
  ) {
    throw new BadGatewayException(
      'Malformed choice message in upstream model response',
    );
  }

  return [
    {
      message: {
        role: 'assistant',
        content: firstChoice.message.content,
      },
      ...(typeof firstChoice.index === 'number'
        ? { index: firstChoice.index }
        : {}),
      ...(typeof firstChoice.finish_reason === 'string'
        ? { finish_reason: firstChoice.finish_reason }
        : {}),
    },
  ];
}

function handleFetchError(
  error: unknown,
  signal?: AbortSignal,
  timeoutSignal?: AbortSignal,
): never {
  const isTimeout =
    (error instanceof Error && error.name === 'TimeoutError') ||
    Boolean(timeoutSignal?.aborted && !signal?.aborted);

  if (isTimeout) {
    throw new GatewayTimeoutException('Upstream deadline exceeded');
  }

  if (signal?.aborted) {
    throw error;
  }

  throw new BadGatewayException('Failed to reach upstream model service');
}

function handleStreamReadError(
  error: unknown,
  signal?: AbortSignal,
  timeoutSignal?: AbortSignal,
): never {
  if (
    error instanceof GatewayTimeoutException ||
    error instanceof BadGatewayException
  ) {
    throw error;
  }

  const isTimeout =
    (error instanceof Error && error.name === 'TimeoutError') ||
    Boolean(timeoutSignal?.aborted && !signal?.aborted);

  if (isTimeout) {
    throw new GatewayTimeoutException('Upstream deadline exceeded');
  }

  if (signal?.aborted) {
    throw error;
  }

  throw new BadGatewayException('Failed to read upstream model response');
}

@Injectable()
export class GeminiClientService {
  constructor(
    @Optional()
    @Inject('GRIP_CONFIG')
    private readonly injectedConfig?: GripConfig | null,
  ) {}

  private requireConfig(): GripConfig {
    return resolveGripConfig(this.injectedConfig);
  }

  private handleHttpStatus(status: number): void {
    if (status === 429) {
      throw new HttpException(
        'Upstream quota exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (status === 401 || status === 403) {
      throw new ServiceUnavailableException(
        'Upstream model service unavailable',
      );
    }
  }

  private async readResponseBody(
    body: ReadableStream<Uint8Array> | null,
    signal?: AbortSignal,
    timeoutSignal?: AbortSignal,
  ): Promise<string> {
    if (!body) {
      throw new BadGatewayException('Empty upstream model response');
    }

    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8');
    let responseText = '';
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        totalBytes += value.byteLength;

        if (totalBytes > GRIP_MAX_UPSTREAM_BYTES) {
          void reader
            .cancel('Upstream response exceeded size limit')
            .catch(() => {});

          throw new BadGatewayException(
            'Upstream response exceeded size limit',
          );
        }

        responseText += decoder.decode(value, { stream: true });
      }

      responseText += decoder.decode();

      return responseText;
    } catch (error: unknown) {
      handleStreamReadError(error, signal, timeoutSignal);
    }
  }

  async complete(
    request: GripCompletionRequest,
    signal?: AbortSignal,
  ): Promise<GripCompletionResponse> {
    const config = this.requireConfig();
    const baseUrl = stripTrailingSlashes(config.geminiBaseUrl);
    const url = `${baseUrl}/chat/completions`;

    const timeoutSignal = AbortSignal.timeout(GRIP_UPSTREAM_TIMEOUT_MS);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    const payload = {
      model: GRIP_ALLOWED_MODEL,
      messages: request.messages,
      response_format: request.response_format,
      max_tokens: GRIP_MAX_OUTPUT_TOKENS,
    };

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.geminiApiKey}`,
          'User-Agent': 'Karazin-UniVerse-Grip-Gateway',
        },
        body: JSON.stringify(payload),
        redirect: 'error',
        signal: combinedSignal,
      });
    } catch (error: unknown) {
      handleFetchError(error, signal, timeoutSignal);
    }

    this.handleHttpStatus(response.status);

    const responseText = await this.readResponseBody(
      response.body,
      signal,
      timeoutSignal,
    );

    if (!response.ok) {
      throw new BadGatewayException('Upstream model error');
    }

    let data: unknown;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new BadGatewayException('Invalid JSON from upstream model service');
    }

    const choices = parseChoices(data);
    const usage = parseUsage((data as { usage?: unknown })?.usage);

    return {
      choices,
      ...(usage ? { usage } : {}),
    };
  }
}
