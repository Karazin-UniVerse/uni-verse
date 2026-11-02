import { BadGatewayException } from '@nestjs/common';
import type {
  GripCompletionResponse,
  GripCompletionUsage,
} from '@universe/core/types/grip';
import { GRIP_MAX_UPSTREAM_BYTES } from './grip.constants';

function parseUsage(value: unknown): GripCompletionUsage | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const usage: GripCompletionUsage = {};

  for (const field of [
    'prompt_tokens',
    'completion_tokens',
    'total_tokens',
  ] as const) {
    const tokens = record[field];

    if (
      typeof tokens === 'number' &&
      Number.isSafeInteger(tokens) &&
      tokens >= 0
    ) {
      usage[field] = tokens;
    }
  }

  return Object.keys(usage).length > 0 ? usage : undefined;
}

export function parseGeminiResponse(text: string): GripCompletionResponse {
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new BadGatewayException('Invalid JSON from upstream model service');
  }

  const record = data as {
    choices?: Array<{
      message?: { content?: unknown };
      index?: unknown;
      finish_reason?: unknown;
    }>;
    usage?: unknown;
  } | null;

  if (!Array.isArray(record?.choices) || record.choices.length === 0) {
    throw new BadGatewayException('Missing choices in upstream model response');
  }

  const choice = record.choices[0];

  if (typeof choice?.message?.content !== 'string') {
    throw new BadGatewayException(
      'Malformed choice message in upstream model response',
    );
  }

  const usage = parseUsage(record.usage);

  return {
    choices: [
      {
        message: { role: 'assistant', content: choice.message.content },
        ...(typeof choice.index === 'number' ? { index: choice.index } : {}),
        ...(typeof choice.finish_reason === 'string'
          ? { finish_reason: choice.finish_reason }
          : {}),
      },
    ],
    ...(usage ? { usage } : {}),
  };
}

export async function readGeminiBody(
  body: ReadableStream<Uint8Array> | null,
  signal: AbortSignal,
): Promise<string> {
  if (!body) {
    throw new BadGatewayException('Empty upstream model response');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let text = '';
  let bytes = 0;
  const onAbort = (): void => {
    void reader.cancel().catch(() => {});
  };

  signal.addEventListener('abort', onAbort, { once: true });

  try {
    signal.throwIfAborted();

    while (true) {
      const { done, value } = await reader.read();

      signal.throwIfAborted();

      if (done) {
        break;
      }

      bytes += value.byteLength;

      if (bytes > GRIP_MAX_UPSTREAM_BYTES) {
        throw new BadGatewayException('Upstream response exceeded size limit');
      }

      text += decoder.decode(value, { stream: true });
    }

    return text + decoder.decode();
  } finally {
    signal.removeEventListener('abort', onAbort);
    void reader
      .cancel(
        bytes > GRIP_MAX_UPSTREAM_BYTES
          ? 'Upstream response exceeded size limit'
          : undefined,
      )
      .catch(() => {});
    reader.releaseLock();
  }
}
