import { queryOptions } from '@tanstack/react-query';
import { GRIP_HOSTED_POLICY } from '@core/constants/grip-hosted';
import { gripApi, GripApiError } from '@uni-hub/services/api.grip';

function pollDelay(error: Error | null): number {
  return error instanceof GripApiError && error.status === 429 && error.retryAt
    ? Math.max(GRIP_HOSTED_POLICY.POLL_INTERVAL_MS, error.retryAt - Date.now())
    : GRIP_HOSTED_POLICY.POLL_INTERVAL_MS;
}

export const gripKeys = {
  root: ['grip-hosted'] as const,
  session: () => ['grip-hosted', 'session'] as const,
  check: (githubId: string, checkId: string) => ['grip-hosted', githubId, checkId] as const,
};

export function gripSessionOptions() {
  return queryOptions({
    queryKey: gripKeys.session(),
    queryFn: () => gripApi.session(),
    retry: false,
    staleTime: 0,
    refetchInterval: (query) => pollDelay(query.state.error),
    refetchOnWindowFocus: (query) =>
      !(query.state.error instanceof GripApiError && (query.state.error.retryAt ?? 0) > Date.now()),
    refetchOnReconnect: (query) =>
      !(query.state.error instanceof GripApiError && (query.state.error.retryAt ?? 0) > Date.now()),
  });
}

export function gripCheckOptions(githubId: string, checkId: string) {
  return queryOptions({
    queryKey: gripKeys.check(githubId, checkId),
    queryFn: () => gripApi.view(checkId),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: (query) =>
      !(query.state.error instanceof GripApiError && (query.state.error.retryAt ?? 0) > Date.now()),
    refetchOnReconnect: (query) =>
      !(query.state.error instanceof GripApiError && (query.state.error.retryAt ?? 0) > Date.now()),
    refetchInterval: (query) =>
      (!query.state.data &&
        query.state.error instanceof GripApiError &&
        query.state.error.status === 429) ||
      ['CREATED', 'GENERATING', 'READY', 'GRADING'].includes(query.state.data?.state ?? '')
        ? pollDelay(query.state.error)
        : false,
  });
}
