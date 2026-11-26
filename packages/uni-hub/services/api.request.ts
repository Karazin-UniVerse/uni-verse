import { RESPONSE_CODES } from '@core/constants/response-codes';
import { AUTH_ROUTES } from '@core/constants/routes';
import type { AuthResponse } from '@core/types/auth';
import { safeStorage, API_BASE_URL } from './api.storage';
import {
  assertSessionGeneration,
  clearUserSessionStorage,
  getSessionGeneration,
  readSessionUser,
  saveSessionUser,
} from './api.session';

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_FACTOR_MS = 500;

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

let refreshPromise: Promise<void> | null = null;
let refreshEpoch = 0;

export function resetRefreshPromiseForTests(): void {
  refreshPromise = null;
  refreshEpoch = 0;
}

async function refreshAccessToken(): Promise<void> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const startGeneration = getSessionGeneration();

  refreshPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);

    try {
      const url = `${API_BASE_URL}/auth/${AUTH_ROUTES.REFRESH}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorDetail = await buildHttpErrorMessage(response);

        assertSessionGeneration(startGeneration, 'token refresh');

        if (
          response.status === RESPONSE_CODES.UNAUTHORIZED ||
          response.status === RESPONSE_CODES.FORBIDDEN
        ) {
          clearUserSessionStorage();
        }

        throw new Error(errorDetail);
      }

      const data = (await response.json()) as Partial<AuthResponse>;

      assertSessionGeneration(startGeneration, 'token refresh');

      if (!data.user) {
        clearUserSessionStorage();

        throw new Error(
          `Refresh response missing user session (HTTP ${RESPONSE_CODES.UNAUTHORIZED})`,
        );
      }

      saveSessionUser(data.user);
      refreshEpoch += 1;
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

  return safeStorage.getItem('isLoggedIn') === 'true' || Boolean(readSessionUser());
}

export type RequestOptions = RequestInit & {
  retries?: number;
  timeoutMs?: number;
  skipAuthRefresh?: boolean;
};

type ExecuteRequestParams<T> = {
  endpoint: string;
  url: string;
  options: RequestInit;
  headers: Record<string, string>;
  timeoutMs: number;
  requestOptions: RequestOptions;
  attemptGeneration: string;
  parseResponse?: (response: Response) => Promise<T>;
};

async function throwHttpError(response: Response, attemptGeneration: string): Promise<never> {
  const errorDetail = await buildHttpErrorMessage(response);

  assertSessionGeneration(attemptGeneration);

  if (response.status === RESPONSE_CODES.UNAUTHORIZED) {
    clearUserSessionStorage();
  }

  throw new Error(errorDetail);
}

async function ensureFreshSessionForRetry(
  attemptEpoch: number,
  attemptGeneration: string,
): Promise<void> {
  assertSessionGeneration(attemptGeneration);

  if (attemptEpoch === refreshEpoch) {
    await refreshAccessToken();
  }

  assertSessionGeneration(attemptGeneration);
}

async function executeRequestWithRefresh<T>({
  endpoint,
  url,
  options,
  headers,
  timeoutMs,
  requestOptions,
  attemptGeneration,
  parseResponse,
}: ExecuteRequestParams<T>): Promise<{ data: T }> {
  const attemptEpoch = refreshEpoch;
  const parse =
    parseResponse ?? ((response: Response): Promise<T> => response.json() as Promise<T>);

  assertSessionGeneration(attemptGeneration);
  const initialResponse = await executeAttempt({ url, options, headers, timeoutMs });

  if (initialResponse.ok) {
    const data = await parse(initialResponse);

    return { data };
  }

  if (
    initialResponse.status !== RESPONSE_CODES.UNAUTHORIZED ||
    !isRefreshCandidate(endpoint, requestOptions)
  ) {
    if (endpoint === `/auth/${AUTH_ROUTES.LOGOUT}`) {
      throw new Error(await buildHttpErrorMessage(initialResponse));
    }

    return throwHttpError(initialResponse, attemptGeneration);
  }

  await ensureFreshSessionForRetry(attemptEpoch, attemptGeneration);

  const retryResponse = await executeAttempt({
    url,
    options,
    headers,
    timeoutMs,
  });

  if (!retryResponse.ok) {
    return throwHttpError(retryResponse, attemptGeneration);
  }

  const retryData = await parse(retryResponse);

  return { data: retryData };
}

async function executeRequest<T>(
  endpoint: string,
  requestOptions: RequestOptions = {},
  parseResponse?: (response: Response) => Promise<T>,
): Promise<{ data: T }> {
  const {
    retries = DEFAULT_RETRIES,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    ...options
  } = requestOptions;
  const url = `${API_BASE_URL}${endpoint}`;

  const buildAttemptHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string>),
  });

  const attemptGeneration = getSessionGeneration();

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
        attemptGeneration,
        parseResponse,
      });
    } catch (error) {
      const isUnauthorized =
        error instanceof Error &&
        (error.message.includes(`HTTP error ${RESPONSE_CODES.UNAUTHORIZED}`) ||
          error.message.includes(`(HTTP ${RESPONSE_CODES.UNAUTHORIZED})`) ||
          error.message.includes(`HTTP error ${RESPONSE_CODES.FORBIDDEN}`) ||
          error.message.includes(`(HTTP ${RESPONSE_CODES.FORBIDDEN})`));

      if (
        attemptGeneration !== getSessionGeneration() ||
        isUnauthorized ||
        options.signal?.aborted ||
        currentAttempt >= retries
      ) {
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

  protected async requestBlob(
    endpoint: string,
    requestOptions: RequestOptions = {},
  ): Promise<Blob> {
    const { data } = await executeRequest<Blob>(endpoint, requestOptions, (response) =>
      response.blob(),
    );

    return data;
  }
}

const HTTP_STATUS_SUFFIX_PATTERN = /\(HTTP \d{3}\)$/;
const HTTP_TRANSPORT_ERROR_PATTERN = /^HTTP error \d{3}(?::|$)/i;

export function getErrorMessage(err: unknown, fallback: string): string {
  const resData = (err as { response?: { data?: { message?: string; error?: string } } })?.response
    ?.data;
  const rawMessage =
    err instanceof Error && err.message ? err.message : resData?.message || resData?.error;

  if (!rawMessage) {
    return fallback;
  }

  const trimmed = rawMessage.trim();

  if (HTTP_TRANSPORT_ERROR_PATTERN.test(trimmed)) {
    return fallback;
  }

  return trimmed.replace(HTTP_STATUS_SUFFIX_PATTERN, '').trim() || fallback;
}
