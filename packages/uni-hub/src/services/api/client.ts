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

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', onCallerAbort, { once: true });
    }
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

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 2,
): Promise<{ data: T }> {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    (isBrowser && window.location.hostname !== 'localhost'
      ? 'https://p01--backend--jm9qjnmpm4m2.code.run'
      : 'http://localhost:3001');

  const url = `${API_BASE_URL}${endpoint}`;
  const token = isBrowser ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && isSecureOrLoopback(url)) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!process.env.MOODLE_TIMEOUT) {
    process.env.MOODLE_TIMEOUT = '30000';
  }

  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await executeAttempt<T>(url, options, headers, Number(process.env.MOODLE_TIMEOUT));
    } catch (err) {
      if (options.signal?.aborted) {
        throw err;
      }

      if (attempt < retries) {
        attempt++;
        const delay = attempt * 500;

        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }

  throw new Error('Request failed');
}
