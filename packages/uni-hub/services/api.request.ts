import { RESPONSE_CODES } from '@core/constants/response-codes';
import { safeStorage, API_BASE_URL } from './api.storage';

function isSecureOrLoopback(targetUrl: string): boolean {
  try {
    const isBrowserEnv = typeof window !== 'undefined';
    const fallbackOrigin = isBrowserEnv ? window.location.origin : 'http://localhost';
    const parsed = new URL(targetUrl, fallbackOrigin);

    return (
      parsed.protocol === 'https:' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1'
    );
  } catch {
    return false;
  }
}

/**
 * Builds a query string from a parameters dictionary, omitting undefined or null fields.
 */
export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      const formattedValue =
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value);

      searchParams.append(key, formattedValue);
    }
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

type ExecuteAttemptParams = {
  url: string;
  options: RequestInit;
  headers: Record<string, string>;
  timeoutMs: number;
};

async function executeAttempt<T>({
  url,
  options,
  headers,
  timeoutMs,
}: ExecuteAttemptParams): Promise<{ data: T }> {
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
      if (response.status === RESPONSE_CODES.UNAUTHORIZED) {
        safeStorage.removeItem('isLoggedIn');
        safeStorage.removeItem('accessToken');
        safeStorage.removeItem('moodleToken');
        safeStorage.removeItem('universe_dashboard_data');
        safeStorage.removeItem('universe_last_sync_time');
      }

      let serverMessage: string | undefined;

      try {
        const errorJson = (await response.json()) as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(errorJson?.message)) {
          serverMessage = errorJson.message.join(', ');
        } else if (typeof errorJson?.message === 'string') {
          serverMessage = errorJson.message;
        } else if (typeof errorJson?.error === 'string') {
          serverMessage = errorJson.error;
        }
      } catch {
        // response was not JSON
      }

      throw new Error(serverMessage || `HTTP error ${response.status}: ${response.statusText}`);
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

export type RequestOptions = RequestInit & { retries?: number; timeoutMs?: number };

export async function request<T>(
  endpoint: string,
  requestOptions: RequestOptions = {},
): Promise<{ data: T }> {
  const { retries = 2, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ...options } = requestOptions;
  const url = `${API_BASE_URL}${endpoint}`;
  const token = safeStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && isSecureOrLoopback(url)) {
    headers.Authorization = `Bearer ${token}`;
  }

  const attemptRequest = async (currentAttempt: number): Promise<{ data: T }> => {
    try {
      return await executeAttempt<T>({ url, options, headers, timeoutMs });
    } catch (err) {
      if (options.signal?.aborted || currentAttempt >= retries) {
        throw err;
      }

      const nextAttempt = currentAttempt + 1;
      const delay = nextAttempt * 500;

      await new Promise((resolve) => setTimeout(resolve, delay));

      return attemptRequest(nextAttempt);
    }
  };

  return attemptRequest(0);
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  const resData = (err as { response?: { data?: { message?: string; error?: string } } })?.response
    ?.data;

  return resData?.message || resData?.error || fallback;
}
