import { RESPONSE_CODES } from '@core/constants/response-codes';
import { AUTH_ROUTES } from '@core/constants/routes';
import { safeStorage, API_BASE_URL } from './api.storage';
import { clearUserSessionStorage } from './api.session';

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_FACTOR_MS = 500;

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
 * Builds a query string from a parameters dictionary, omitting undefined, null, or empty string fields.
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

async function extractServerErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const errorJson = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(errorJson?.message)) {
      return errorJson.message.join(', ');
    }

    if (typeof errorJson?.message === 'string') {
      return errorJson.message;
    }

    if (typeof errorJson?.error === 'string') {
      return errorJson.error;
    }
  } catch {
    // response was not JSON
  }

  return undefined;
}

async function buildHttpErrorMessage(response: Response): Promise<string> {
  const serverMessage = await extractServerErrorMessage(response);

  return serverMessage
    ? `${serverMessage} (HTTP ${response.status})`
    : `HTTP error ${response.status}: ${response.statusText}`;
}

type ExecuteAttemptParams = {
  url: string;
  options: RequestInit;
  headers: Record<string, string>;
  timeoutMs: number;
};

async function executeAttempt({
  url,
  options,
  headers,
  timeoutMs,
}: ExecuteAttemptParams): Promise<Response> {
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
    return await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);

    if (options.signal) {
      options.signal.removeEventListener('abort', onCallerAbort);
    }
  }
}

let refreshPromise: Promise<string> | null = null;

export function resetRefreshPromiseForTests(): void {
  refreshPromise = null;
}

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);

    try {
      const url = `${API_BASE_URL}/auth/${AUTH_ROUTES.REFRESH}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        if (
          response.status === RESPONSE_CODES.UNAUTHORIZED ||
          response.status === RESPONSE_CODES.FORBIDDEN
        ) {
          clearUserSessionStorage();
        }

        const errorDetail = await buildHttpErrorMessage(response);

        throw new Error(errorDetail);
      }

      const data = (await response.json()) as { access_token?: string };

      if (!data.access_token) {
        clearUserSessionStorage();

        throw new Error('Refresh response missing access token');
      }

      safeStorage.setItem('accessToken', data.access_token);

      return data.access_token;
    } finally {
      clearTimeout(timeoutId);
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function isRefreshCandidate(endpoint: string, options: RequestOptions): boolean {
  if (options.skipAuthRefresh) {
    return false;
  }

  const isAuthEndpoint =
    endpoint.startsWith(`/auth/${AUTH_ROUTES.REFRESH}`) ||
    endpoint.startsWith(`/auth/${AUTH_ROUTES.LOGIN}`) ||
    endpoint.startsWith(`/auth/${AUTH_ROUTES.REGISTER}`) ||
    endpoint.startsWith(`/auth/${AUTH_ROUTES.GOOGLE}`) ||
    endpoint.startsWith(`/auth/${AUTH_ROUTES.LOGOUT}`);

  if (isAuthEndpoint) {
    return false;
  }

  return Boolean(safeStorage.getItem('accessToken'));
}

export type RequestOptions = RequestInit & {
  retries?: number;
  timeoutMs?: number;
  skipAuthRefresh?: boolean;
};

type ExecuteRequestParams = {
  endpoint: string;
  url: string;
  options: RequestInit;
  headers: Record<string, string>;
  timeoutMs: number;
  requestOptions: RequestOptions;
};

async function executeRequestWithRefresh<T>({
  endpoint,
  url,
  options,
  headers,
  timeoutMs,
  requestOptions,
}: ExecuteRequestParams): Promise<{ data: T }> {
  const initialResponse = await executeAttempt({ url, options, headers, timeoutMs });

  if (initialResponse.ok) {
    const data = (await initialResponse.json()) as T;

    return { data };
  }

  if (
    initialResponse.status === RESPONSE_CODES.UNAUTHORIZED &&
    isRefreshCandidate(endpoint, requestOptions)
  ) {
    const storedToken = safeStorage.getItem('accessToken');
    const sentToken = headers.Authorization?.replace('Bearer ', '');

    const newToken =
      storedToken && storedToken !== sentToken ? storedToken : await refreshAccessToken();

    const retryHeaders: Record<string, string> = {
      ...headers,
    };

    if (isSecureOrLoopback(url)) {
      retryHeaders.Authorization = `Bearer ${newToken}`;
    }

    const retryResponse = await executeAttempt({
      url,
      options,
      headers: retryHeaders,
      timeoutMs,
    });

    if (!retryResponse.ok) {
      if (retryResponse.status === RESPONSE_CODES.UNAUTHORIZED) {
        clearUserSessionStorage();
      }

      const retryErrorDetail = await buildHttpErrorMessage(retryResponse);

      throw new Error(retryErrorDetail);
    }

    const retryData = (await retryResponse.json()) as T;

    return { data: retryData };
  }

  if (initialResponse.status === RESPONSE_CODES.UNAUTHORIZED) {
    clearUserSessionStorage();
  }

  const errorDetail = await buildHttpErrorMessage(initialResponse);

  throw new Error(errorDetail);
}

async function executeRequest<T>(
  endpoint: string,
  requestOptions: RequestOptions = {},
): Promise<{ data: T }> {
  const {
    retries = DEFAULT_RETRIES,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    ...options
  } = requestOptions;
  const url = `${API_BASE_URL}${endpoint}`;

  const buildAttemptHeaders = (): Record<string, string> => {
    const token = safeStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token && isSecureOrLoopback(url)) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

  const attemptRequest = async (currentAttempt: number): Promise<{ data: T }> => {
    try {
      const headers = buildAttemptHeaders();

      return await executeRequestWithRefresh<T>({
        endpoint,
        url,
        options,
        headers,
        timeoutMs,
        requestOptions,
      });
    } catch (error) {
      const isUnauthorized =
        error instanceof Error &&
        (error.message.includes(`HTTP error ${RESPONSE_CODES.UNAUTHORIZED}`) ||
          error.message.includes(`(HTTP ${RESPONSE_CODES.UNAUTHORIZED})`) ||
          error.message.includes(`HTTP error ${RESPONSE_CODES.FORBIDDEN}`) ||
          error.message.includes(`(HTTP ${RESPONSE_CODES.FORBIDDEN})`));

      if (isUnauthorized || options.signal?.aborted || currentAttempt >= retries) {
        throw error;
      }

      const nextAttempt = currentAttempt + 1;
      const delay = nextAttempt * RETRY_DELAY_FACTOR_MS;

      await new Promise((resolve) => setTimeout(resolve, delay));

      return attemptRequest(nextAttempt);
    }
  };

  return attemptRequest(0);
}

export abstract class ApiClient {
  protected request<T>(
    endpoint: string,
    requestOptions: RequestOptions = {},
  ): Promise<{ data: T }> {
    return executeRequest<T>(endpoint, requestOptions);
  }
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  const resData = (err as { response?: { data?: { message?: string; error?: string } } })?.response
    ?.data;

  return resData?.message || resData?.error || fallback;
}
