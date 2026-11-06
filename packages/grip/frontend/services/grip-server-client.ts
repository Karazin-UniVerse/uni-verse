import type {
  GripBrowserCallbackRequest,
  GripBrowserIdentity,
  GripBrowserLoginRequest,
  GripCheckStatus,
  GripCheckView,
  GripSubmissionRequest,
} from '@core/types/grip-hosted';
import { ApiClient } from './api.request';
import { gripRetrySeconds } from './grip-retry';
import {
  GRIP_CHECK_STATE,
  GRIP_CHECK_REASON,
  GRIP_HOSTED_POLICY,
} from '@core/constants/grip-hosted';

const REQUEST_TIMEOUT_MS = 65_000;
const CHECK_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function projectGripStatus(value: unknown, checkId: string): GripCheckStatus {
  if (!value || typeof value !== 'object') throw new Error('Invalid hosted Grip status');

  const record = value as Record<string, unknown>;
  const state = Object.values(GRIP_CHECK_STATE).find((entry) => entry === record.state);
  const reason = Object.values(GRIP_CHECK_REASON).find((entry) => entry === record.reason);

  if (
    record.checkId !== checkId ||
    !state ||
    typeof record.bindingDigest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(record.bindingDigest) ||
    typeof record.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(record.expiresAt)) ||
    typeof record.passValidUntil !== 'string' ||
    !Number.isFinite(Date.parse(record.passValidUntil)) ||
    record.policyVersion !== GRIP_HOSTED_POLICY.VERSION ||
    (record.reason !== undefined && !reason) ||
    (record.score !== undefined &&
      (!Number.isInteger(record.score) || Number(record.score) < 0 || Number(record.score) > 100))
  )
    throw new Error('Invalid hosted Grip status');

  return {
    checkId,
    state,
    bindingDigest: record.bindingDigest,
    expiresAt: record.expiresAt,
    passValidUntil: record.passValidUntil,
    policyVersion: record.policyVersion,
    ...(typeof record.score === 'number' ? { score: record.score } : {}),
    ...(reason ? { reason } : {}),
  };
}

export class GripServerClient extends ApiClient {
  private readonly origin: string;

  constructor(origin: string) {
    super();
    const parsed = new URL(origin);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);

    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash ||
      (parsed.protocol !== 'https:' && !(loopback && parsed.protocol === 'http:'))
    ) {
      throw new Error('Invalid hosted Grip backend origin');
    }

    this.origin = parsed.origin;
  }

  private async requestGrip<Result>({
    path,
    token,
    body,
    origin,
    csrfToken,
    operation = false,
    method = 'GET',
  }: {
    path: string;
    token?: string;
    body?: object;
    origin?: string;
    csrfToken?: string;
    operation?: boolean;
    method?: string;
  }): Promise<Result> {
    const response = await this.fetchResponse(`${this.origin}/dev-tools/grip/browser/${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `GripBrowser ${token}` } : {}),
        ...(origin ? { Origin: origin } : {}),
        ...(csrfToken ? { 'X-Grip-CSRF': csrfToken } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      if (operation && response.status === 429) {
        const body: unknown = await response.json().catch(() => null);

        if (
          body &&
          typeof body === 'object' &&
          'state' in body &&
          body.state === 'QUOTA_REJECTED' &&
          'checkId' in body &&
          body.checkId === path.split('/')[1]
        ) {
          return {
            status: response.status,
            body: projectGripStatus(body, path.split('/')[1]),
          } as Result;
        }
      }

      throw new GripServerError(
        response.status,
        gripRetrySeconds(response.headers.get('Retry-After')),
      );
    }

    if (response.status === 204) {
      return undefined as Result;
    }

    const responseBody: unknown = await response.json();

    return (
      operation
        ? { status: response.status, body: projectGripStatus(responseBody, path.split('/')[1]) }
        : responseBody
    ) as Result;
  }

  session(token: string): Promise<GripBrowserIdentity> {
    return this.requestGrip({ path: 'session', token });
  }

  start(input: GripBrowserLoginRequest): Promise<{ authorizationUrl: string }> {
    return this.requestGrip({ path: 'auth/start', method: 'POST', body: input });
  }

  callback(
    input: GripBrowserCallbackRequest,
  ): Promise<{ token: string; identity: GripBrowserIdentity; returnCheckId: string }> {
    return this.requestGrip({ path: 'auth/callback', method: 'POST', body: input });
  }

  async view(token: string, checkId: string): Promise<GripCheckView> {
    this.assertCheckId(checkId);

    return this.requestGrip({ path: `checks/${checkId}`, token });
  }

  async submit({
    token,
    checkId,
    input,
    origin,
    csrfToken,
  }: {
    token: string;
    checkId: string;
    input: GripSubmissionRequest;
    origin: string;
    csrfToken: string;
  }): Promise<{ status: number; body: GripCheckStatus }> {
    this.assertCheckId(checkId);

    return this.requestGrip({
      path: `checks/${checkId}/submissions`,
      token,
      method: 'POST',
      body: input,
      origin,
      csrfToken,
      operation: true,
    });
  }

  async cancel({
    token,
    checkId,
    origin,
    csrfToken,
  }: {
    token: string;
    checkId: string;
    origin: string;
    csrfToken: string;
  }): Promise<void> {
    this.assertCheckId(checkId);
    await this.requestGrip({
      path: `checks/${checkId}/cancellation`,
      token,
      method: 'POST',
      origin,
      csrfToken,
    });
  }

  async logout({
    token,
    origin,
    csrfToken,
  }: {
    token: string;
    origin: string;
    csrfToken: string;
  }): Promise<void> {
    await this.requestGrip({ path: 'logout', token, method: 'POST', origin, csrfToken });
  }

  private assertCheckId(checkId: string): void {
    if (!CHECK_ID_PATTERN.test(checkId)) {
      throw new Error('Invalid hosted Grip check ID');
    }
  }
}

export class GripServerError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter?: number,
  ) {
    super('Hosted Grip request failed');
  }
}
