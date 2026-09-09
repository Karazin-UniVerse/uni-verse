import { isBrowser } from '@uni-hub/utils/browser';
import { isSecureOrLoopback } from '@uni-hub/services/api/api-utils';

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
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
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

function getRequestTimeoutMs(): number {
  return Number(process.env.MOODLE_TIMEOUT || '30000');
}

async function handleRetry(
  err: unknown,
  attempt: number,
  retries: number,
  signal?: AbortSignal | null,
): Promise<void> {
  if (signal?.aborted || attempt >= retries) {
    throw err;
  }

  const delay = (attempt + 1) * 500;

  await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 2,
): Promise<{ data: T }> {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const headers = buildHeaders(url, options.headers);
  const timeoutMs = getRequestTimeoutMs();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await executeAttempt<T>(url, options, headers, timeoutMs);
    } catch (err) {
      await handleRetry(err, attempt, retries, options.signal);
    }
  }

  throw new Error('Request failed');
}
