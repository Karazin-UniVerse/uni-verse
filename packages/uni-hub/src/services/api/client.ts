import { isBrowser } from '@uni-hub/utils/browser';
import { isSecureOrLoopback } from '@uni-hub/services/api/api-utils';

/**
 * Custom error class representing non-2xx HTTP responses, exposing the status code and text.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`HTTP error ${status}: ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
  }
}

export async function executeAttempt<T>(
  url: string,
  options: RequestInit,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<{ data: T }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onCallerAbort = () => controller.abort();

  if (options.signal?.aborted) {
    controller.abort();
  } else if (options.signal) {
    options.signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpError(response.status, response.statusText);
    }

    const data = (await response.json()) as T;

    return { data };
  } finally {
    clearTimeout(timeoutId);

    if (options.signal) {
      options.signal.removeEventListener('abort', onCallerAbort);
    }
  }
}

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (isBrowser && window.location.hostname !== 'localhost') {
    return 'https://p01--backend--jm9qjnmpm4m2.code.run';
  }

  return 'http://localhost:3001';
}

function buildHeaders(url: string, customHeaders?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  const token = isBrowser ? localStorage.getItem('accessToken') : null;

  if (token && isSecureOrLoopback(url)) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Resolves request timeout from environment variables with fallback to 30000ms.
 * Checks NEXT_PUBLIC_MOODLE_TIMEOUT for browser execution and validates against NaN.
 */
function getRequestTimeoutMs(): number {
  const raw =
    (isBrowser ? process.env.NEXT_PUBLIC_MOODLE_TIMEOUT : process.env.MOODLE_TIMEOUT) ||
    process.env.NEXT_PUBLIC_MOODLE_TIMEOUT ||
    process.env.MOODLE_TIMEOUT ||
    '30000';
  const parsed = Number(raw);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000;
}

/**
 * Checks if an HTTP method is idempotent and safe to retry automatically.
 */
function isRetryableMethod(method?: string): boolean {
  if (!method) {
    return true;
  }

  const upper = method.toUpperCase();

  return upper === 'GET' || upper === 'HEAD' || upper === 'OPTIONS';
}

/**
 * Checks if an error is transient and safe to retry.
 * Avoids retrying 4xx client errors (except 429 rate limiting).
 */
function isRetryableError(err: unknown): boolean {
  if (err instanceof HttpError) {
    return err.status === 429 || err.status >= 500;
  }

  return true;
}

async function handleRetry(
  err: unknown,
  attempt: number,
  retries: number,
  signal?: AbortSignal | null,
): Promise<void> {
  if (signal?.aborted || attempt >= retries || !isRetryableError(err)) {
    throw err;
  }

  const delay = (attempt + 1) * 500;

  await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retries?: number,
): Promise<{ data: T }> {
  const defaultRetries = isRetryableMethod(options.method) ? 2 : 0;
  const effectiveRetries = retries ?? defaultRetries;
  const url = `${getApiBaseUrl()}${endpoint}`;
  const headers = buildHeaders(url, options.headers);
  const timeoutMs = getRequestTimeoutMs();

  for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
    try {
      return await executeAttempt<T>(url, options, headers, timeoutMs);
    } catch (err) {
      await handleRetry(err, attempt, effectiveRetries, options.signal);
    }
  }

  throw new Error('Request failed');
}
