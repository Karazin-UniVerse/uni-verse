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

  async complete(
    request: GripCompletionRequest,
    signal?: AbortSignal,
  ): Promise<GripCompletionResponse> {
    const config = this.requireConfig();
    const baseUrl = config.geminiBaseUrl.replace(/\/+$/, '');
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
      if (
        (error instanceof Error && error.name === 'TimeoutError') ||
        (timeoutSignal.aborted && !signal?.aborted)
      ) {
        throw new GatewayTimeoutException('Upstream deadline exceeded');
      }

      if (signal?.aborted) {
        throw error;
      }

      throw new BadGatewayException('Failed to reach upstream model service');
    }

    if (response.status === 429) {
      throw new HttpException(
        'Upstream quota exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ServiceUnavailableException(
        'Upstream model service unavailable',
      );
    }

    let responseText = '';
    let totalBytes = 0;

    if (!response.body) {
      throw new BadGatewayException('Empty upstream model response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          totalBytes += value.byteLength;

          if (totalBytes > GRIP_MAX_UPSTREAM_BYTES) {
            await reader.cancel('Upstream response exceeded size limit');

            throw new BadGatewayException(
              'Upstream response exceeded size limit',
            );
          }

          responseText += decoder.decode(value, { stream: true });
        }
      }

      responseText += decoder.decode();
    } catch (error: unknown) {
      if (
        error instanceof GatewayTimeoutException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }

      if (
        (error instanceof Error && error.name === 'TimeoutError') ||
        (timeoutSignal.aborted && !signal?.aborted)
      ) {
        throw new GatewayTimeoutException('Upstream deadline exceeded');
      }

      if (signal?.aborted) {
        throw error;
      }

      throw new BadGatewayException('Failed to read upstream model response');
    }

    if (!response.ok) {
      throw new BadGatewayException('Upstream model error');
    }

    let data: unknown;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new BadGatewayException('Invalid JSON from upstream model service');
    }

    const dataRecord = data as {
      choices?: Array<{
        message?: { role?: string; content?: unknown };
        index?: unknown;
        finish_reason?: unknown;
      }>;
      usage?: {
        prompt_tokens?: unknown;
        completion_tokens?: unknown;
        total_tokens?: unknown;
      };
    };

    if (
      !Array.isArray(dataRecord?.choices) ||
      dataRecord.choices.length === 0
    ) {
      throw new BadGatewayException(
        'Missing choices in upstream model response',
      );
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

    let usage: GripCompletionUsage | undefined;

    if (dataRecord.usage && typeof dataRecord.usage === 'object') {
      const promptTokens =
        Number.isSafeInteger(dataRecord.usage.prompt_tokens) &&
        (dataRecord.usage.prompt_tokens as number) >= 0
          ? (dataRecord.usage.prompt_tokens as number)
          : undefined;

      const completionTokens =
        Number.isSafeInteger(dataRecord.usage.completion_tokens) &&
        (dataRecord.usage.completion_tokens as number) >= 0
          ? (dataRecord.usage.completion_tokens as number)
          : undefined;

      const totalTokens =
        Number.isSafeInteger(dataRecord.usage.total_tokens) &&
        (dataRecord.usage.total_tokens as number) >= 0
          ? (dataRecord.usage.total_tokens as number)
          : undefined;

      if (
        promptTokens !== undefined ||
        completionTokens !== undefined ||
        totalTokens !== undefined
      ) {
        usage = {
          ...(promptTokens !== undefined
            ? { prompt_tokens: promptTokens }
            : {}),
          ...(completionTokens !== undefined
            ? { completion_tokens: completionTokens }
            : {}),
          ...(totalTokens !== undefined ? { total_tokens: totalTokens } : {}),
        };
      }
    }

    return {
      choices: [
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
      ],
      ...(usage ? { usage } : {}),
    };
  }
}
