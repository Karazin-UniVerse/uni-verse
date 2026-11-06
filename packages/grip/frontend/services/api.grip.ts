import type {
  GripBrowserIdentity,
  GripCheckStatus,
  GripCheckView,
  GripSubmissionRequest,
} from '@core/types/grip-hosted';
import { ApiClient } from './api.request';
import { gripRetrySeconds } from './grip-retry';

const REQUEST_TIMEOUT_MS = 65_000;

export class GripApiError extends Error {
  constructor(
    readonly status: number,
    readonly retryAt?: number,
  ) {
    super('Hosted Grip request failed');
  }
}

export class GripApi extends ApiClient {
  private async requestGrip<Result>({
    route,
    input,
    csrfToken,
  }: {
    route: string;
    input?: object;
    csrfToken?: string;
  }): Promise<Result> {
    const response = await this.fetchResponse(`/dev-tools/grip/api/${route}`, {
      method: input ? 'POST' : 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        ...(input ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken ? { 'X-Grip-CSRF': csrfToken } : {}),
      },
      body: input ? JSON.stringify(input) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const seconds = gripRetrySeconds(response.headers.get('Retry-After'));

      throw new GripApiError(response.status, seconds ? Date.now() + seconds * 1000 : undefined);
    }

    if (response.status === 204) {
      return undefined as Result;
    }

    return response.json() as Promise<Result>;
  }

  session(): Promise<GripBrowserIdentity> {
    return this.requestGrip({ route: 'auth/session' });
  }

  view(checkId: string): Promise<GripCheckView> {
    return this.requestGrip({ route: `checks/${encodeURIComponent(checkId)}` });
  }

  submit({
    checkId,
    input,
    csrfToken,
  }: {
    checkId: string;
    input: GripSubmissionRequest;
    csrfToken: string;
  }): Promise<GripCheckStatus> {
    return this.requestGrip({
      route: `checks/${encodeURIComponent(checkId)}/submissions`,
      input,
      csrfToken,
    });
  }

  cancel({ checkId, csrfToken }: { checkId: string; csrfToken: string }): Promise<void> {
    return this.requestGrip({
      route: `checks/${encodeURIComponent(checkId)}/cancellation`,
      input: {},
      csrfToken,
    });
  }

  logout(csrfToken: string): Promise<void> {
    return this.requestGrip({ route: 'auth/logout', input: {}, csrfToken });
  }
}

export const gripApi = new GripApi();
