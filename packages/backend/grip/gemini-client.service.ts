import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  GripCompletionRequest,
  GripCompletionResponse,
} from '@universe/core/types/grip';
import {
  GRIP_ALLOWED_MODEL,
  GRIP_MAX_OUTPUT_TOKENS,
  GRIP_MAX_UPSTREAM_ATTEMPTS,
  GRIP_RETRY_BACKOFF_MS,
  GRIP_UPSTREAM_TIMEOUT_MS,
} from './grip.constants';
import { resolveGripConfig } from './grip.helpers';
import { GeminiKeyPool } from './gemini-key-pool';
import { parseGeminiResponse, readGeminiBody } from './gemini-response.helpers';
import type {
  GeminiAttemptContext,
  GeminiAttemptOutcome,
  GeminiFailureParams,
  GeminiFailedAttemptParams,
  GripConfig,
} from './grip.types';

class GeminiAttemptFailure extends Error {
  constructor(readonly details: GeminiFailureParams) {
    super(details.exception.message);
  }
}

function stripTrailingSlashes(url: string): string {
  let trimmed = url;

  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed;
}

function httpFailure(response: Response): GeminiAttemptFailure {
  const status = response.status;
  let exception: HttpException = new BadGatewayException(
    'Upstream model error',
  );

  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    exception = new HttpException(
      'Upstream quota exceeded',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  } else if (
    status === HttpStatus.UNAUTHORIZED ||
    status === HttpStatus.FORBIDDEN
  ) {
    exception = new ServiceUnavailableException(
      'Upstream model service unavailable',
    );
  }

  return new GeminiAttemptFailure({
    exception,
    retryable: [
      HttpStatus.TOO_MANY_REQUESTS,
      HttpStatus.INTERNAL_SERVER_ERROR,
      HttpStatus.BAD_GATEWAY,
      HttpStatus.SERVICE_UNAVAILABLE,
      HttpStatus.GATEWAY_TIMEOUT,
    ].includes(status),
    outcome: 'http_error',
    status,
    retryAfter: response.headers.get('retry-after'),
  });
}

function checkCancellation(context: GeminiAttemptContext): void {
  context.callerSignal?.throwIfAborted();

  if (context.signal.aborted) {
    throw new GatewayTimeoutException('Upstream deadline exceeded');
  }
}

function transportFailure(
  error: unknown,
  context: GeminiAttemptContext,
  outcome: 'network_error' | 'read_error',
): GeminiAttemptFailure {
  checkCancellation(context);

  if (error instanceof Error && error.name === 'TimeoutError') {
    return new GeminiAttemptFailure({
      exception: new GatewayTimeoutException('Upstream deadline exceeded'),
      retryable: false,
      outcome: 'timeout',
    });
  }

  if (error instanceof BadGatewayException) {
    return new GeminiAttemptFailure({
      exception: error,
      retryable: false,
      outcome: 'invalid_response',
    });
  }

  return new GeminiAttemptFailure({
    exception: new BadGatewayException(
      outcome === 'network_error'
        ? 'Failed to reach upstream model service'
        : 'Failed to read upstream model response',
    ),
    retryable: true,
    outcome,
  });
}

function retryBackoff(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, GRIP_RETRY_BACKOFF_MS);

    signal.addEventListener('abort', onAbort, { once: true });

    if (signal.aborted) {
      signal.removeEventListener('abort', onAbort);
      onAbort();
    }
  });
}

@Injectable()
export class GeminiClientService {
  private readonly logger = new Logger(GeminiClientService.name);
  private pool?: GeminiKeyPool;

  constructor(
    @Optional()
    @Inject('GRIP_CONFIG')
    private readonly injectedConfig?: GripConfig | null,
  ) {}

  private async attempt(
    context: GeminiAttemptContext,
    apiKey: string,
  ): Promise<GripCompletionResponse> {
    let response: Response;

    try {
      response = await fetch(context.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'Karazin-UniVerse-Grip-Gateway',
        },
        body: context.payload,
        redirect: 'manual',
        signal: context.signal,
      });
    } catch (error: unknown) {
      throw transportFailure(error, context, 'network_error');
    }

    if (context.signal.aborted || !response.ok) {
      void response.body?.cancel().catch(() => {});
      checkCancellation(context);

      throw httpFailure(response);
    }

    let text: string;

    try {
      text = await readGeminiBody(response.body, context.signal);
    } catch (error: unknown) {
      throw transportFailure(error, context, 'read_error');
    }

    checkCancellation(context);

    try {
      return parseGeminiResponse(text);
    } catch (error: unknown) {
      throw transportFailure(error, context, 'read_error');
    }
  }

  private handleFailedAttempt({
    error,
    context,
    pool,
    attempted,
    slot,
    attempt,
    startedAt,
  }: GeminiFailedAttemptParams): HttpException {
    const failure =
      error instanceof GeminiAttemptFailure ? error.details : undefined;

    if (
      failure?.retryable ||
      failure?.status === HttpStatus.UNAUTHORIZED ||
      failure?.status === HttpStatus.FORBIDDEN
    ) {
      pool.coolDown({
        slot,
        status: failure.status,
        retryAfter: failure.retryAfter,
      });
    }

    const failover = Boolean(
      failure?.retryable &&
      attempt < GRIP_MAX_UPSTREAM_ATTEMPTS &&
      !context.signal.aborted &&
      pool.hasAvailable(attempted),
    );
    const outcome: GeminiAttemptOutcome = context.callerSignal?.aborted
      ? 'cancelled'
      : 'timeout';

    this.logger.warn('Grip upstream attempt', {
      keySlot: slot + 1,
      attempt,
      ...(failure?.status !== undefined ? { status: failure.status } : {}),
      elapsedMs: Date.now() - startedAt,
      outcome: failure?.outcome ?? outcome,
      failover,
    });

    if (!failure || !failover) {
      throw failure?.exception ?? error;
    }

    return failure.exception;
  }

  async complete(
    request: GripCompletionRequest,
    callerSignal?: AbortSignal,
  ): Promise<GripCompletionResponse> {
    const config = resolveGripConfig(this.injectedConfig);
    const pool = (this.pool ??= new GeminiKeyPool(config.geminiApiKeys));
    const timeoutSignal = AbortSignal.timeout(GRIP_UPSTREAM_TIMEOUT_MS);
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;
    const context: GeminiAttemptContext = {
      url: `${stripTrailingSlashes(config.geminiBaseUrl)}/chat/completions`,
      payload: JSON.stringify({
        model: GRIP_ALLOWED_MODEL,
        messages: request.messages,
        response_format: request.response_format,
        max_tokens: GRIP_MAX_OUTPUT_TOKENS,
      }),
      signal,
      callerSignal,
    };
    const attempted = new Set<number>();
    let lastFailure: HttpException | undefined;

    for (let attempt = 1; ; attempt += 1) {
      checkCancellation(context);
      const reservation = pool.reserve(attempted);

      if (!reservation) {
        throw (
          lastFailure ??
          new ServiceUnavailableException(
            'Upstream model keys temporarily unavailable',
          )
        );
      }

      attempted.add(reservation.slot);
      const startedAt = Date.now();

      try {
        const response = await this.attempt(context, reservation.apiKey);

        this.logger.debug('Grip upstream attempt', {
          keySlot: reservation.slot + 1,
          attempt,
          elapsedMs: Date.now() - startedAt,
          outcome: 'success',
          failover: false,
        });

        return response;
      } catch (error: unknown) {
        lastFailure = this.handleFailedAttempt({
          error,
          context,
          pool,
          attempted,
          slot: reservation.slot,
          attempt,
          startedAt,
        });
      } finally {
        pool.release(reservation.slot);
      }

      try {
        // Failover depends on the previous failure; parallel attempts would duplicate model calls.
        await retryBackoff(signal);
      } catch (error: unknown) {
        checkCancellation(context);

        throw error;
      }
    }
  }
}
