import proxyAddr from 'proxy-addr';
import { BadRequestException } from '@nestjs/common';
import type {
  GripCompletionRequest,
  GripMessage,
  GripResponseFormat,
} from '@universe/core/types/grip';
import {
  GRIP_ALLOWED_MODEL,
  GRIP_MAX_MESSAGES_COMBINED_BYTES,
  GRIP_MAX_SCHEMA_BYTES,
  GRIP_MAX_SCHEMA_NAME_LENGTH,
} from './grip.constants';

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'model',
  'messages',
  'response_format',
]);
const ALLOWED_MESSAGE_KEYS = new Set(['role', 'content']);
const ALLOWED_RESPONSE_FORMAT_KEYS = new Set(['type', 'json_schema']);
const ALLOWED_JSON_SCHEMA_KEYS = new Set(['name', 'schema', 'strict']);
const SCHEMA_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateMessages(messages: unknown): [GripMessage, GripMessage] {
  if (!Array.isArray(messages) || messages.length !== 2) {
    throw new BadRequestException(
      'Completion request must include exactly 2 messages',
    );
  }

  const [systemMessage, userMessage] = messages;

  if (!isRecord(systemMessage) || !isRecord(userMessage)) {
    throw new BadRequestException('Messages must be objects');
  }

  for (const key of Object.keys(systemMessage)) {
    if (!ALLOWED_MESSAGE_KEYS.has(key)) {
      throw new BadRequestException(`Unexpected message field: ${key}`);
    }
  }

  for (const key of Object.keys(userMessage)) {
    if (!ALLOWED_MESSAGE_KEYS.has(key)) {
      throw new BadRequestException(`Unexpected message field: ${key}`);
    }
  }

  if (systemMessage.role !== 'system') {
    throw new BadRequestException('First message role must be system');
  }

  if (typeof systemMessage.content !== 'string') {
    throw new BadRequestException(
      'System message content must be a text string',
    );
  }

  if (userMessage.role !== 'user') {
    throw new BadRequestException('Second message role must be user');
  }

  if (typeof userMessage.content !== 'string') {
    throw new BadRequestException('User message content must be a text string');
  }

  const combinedBytes =
    Buffer.byteLength(systemMessage.content, 'utf8') +
    Buffer.byteLength(userMessage.content, 'utf8');

  if (combinedBytes > GRIP_MAX_MESSAGES_COMBINED_BYTES) {
    throw new BadRequestException(
      `Combined message content exceeds byte limit of ${GRIP_MAX_MESSAGES_COMBINED_BYTES}`,
    );
  }

  return [
    { role: 'system', content: systemMessage.content },
    { role: 'user', content: userMessage.content },
  ];
}

function validateResponseFormat(responseFormat: unknown): GripResponseFormat {
  if (!isRecord(responseFormat)) {
    throw new BadRequestException('response_format must be an object');
  }

  for (const key of Object.keys(responseFormat)) {
    if (!ALLOWED_RESPONSE_FORMAT_KEYS.has(key)) {
      throw new BadRequestException(
        `Unexpected field in response_format: ${key}`,
      );
    }
  }

  if (responseFormat.type !== 'json_schema') {
    throw new BadRequestException('response_format type must be json_schema');
  }

  const jsonSchema = responseFormat.json_schema;

  if (!isRecord(jsonSchema)) {
    throw new BadRequestException(
      'response_format.json_schema must be an object',
    );
  }

  for (const key of Object.keys(jsonSchema)) {
    if (!ALLOWED_JSON_SCHEMA_KEYS.has(key)) {
      throw new BadRequestException(`Unexpected field in json_schema: ${key}`);
    }
  }

  if (
    typeof jsonSchema.name !== 'string' ||
    jsonSchema.name.length === 0 ||
    jsonSchema.name.length > GRIP_MAX_SCHEMA_NAME_LENGTH ||
    !SCHEMA_NAME_REGEX.test(jsonSchema.name)
  ) {
    throw new BadRequestException('Invalid json_schema name');
  }

  if (!isRecord(jsonSchema.schema)) {
    throw new BadRequestException('json_schema.schema must be an object');
  }

  const serializedSchema = JSON.stringify(jsonSchema.schema);
  const schemaBytes = Buffer.byteLength(serializedSchema, 'utf8');

  if (schemaBytes > GRIP_MAX_SCHEMA_BYTES) {
    throw new BadRequestException(
      `json_schema.schema size exceeds limit of ${GRIP_MAX_SCHEMA_BYTES} bytes`,
    );
  }

  return {
    type: 'json_schema',
    json_schema: {
      name: jsonSchema.name,
      schema: jsonSchema.schema,
      ...(typeof jsonSchema.strict === 'boolean'
        ? { strict: jsonSchema.strict }
        : {}),
    },
  };
}

export function validateGripCompletion(value: unknown): GripCompletionRequest {
  if (!isRecord(value)) {
    throw new BadRequestException('Request body must be a JSON object');
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      throw new BadRequestException(`Unexpected field in request body: ${key}`);
    }
  }

  if (value.model !== GRIP_ALLOWED_MODEL) {
    throw new BadRequestException(`Model must be ${GRIP_ALLOWED_MODEL}`);
  }

  const messages = validateMessages(value.messages);
  const responseFormat = validateResponseFormat(value.response_format);

  return {
    model: GRIP_ALLOWED_MODEL,
    messages,
    response_format: responseFormat,
  };
}

export function resolveClientIp(
  request: {
    headers: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  },
  trustedProxies: string[],
): string {
  const remoteAddress = request.socket?.remoteAddress || '127.0.0.1';

  if (!trustedProxies || trustedProxies.length === 0) {
    return remoteAddress;
  }

  const isTrusted = proxyAddr.compile(trustedProxies);
  const ip = proxyAddr(
    request as unknown as Parameters<typeof proxyAddr>[0],
    isTrusted,
  );

  return ip || remoteAddress;
}
