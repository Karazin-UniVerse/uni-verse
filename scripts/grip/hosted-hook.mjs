import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import {
  GRIP_CHECK_REASON,
  GRIP_HOSTED_POLICY,
} from '../../packages/core/constants/grip-hosted.ts';
import { createGripBindingDigest } from '../../packages/core/utils/grip-hosted.ts';
import { launchBrowser } from './device-login.mjs';

const STATES = new Set([
  'CREATED',
  'GENERATING',
  'READY',
  'GRADING',
  'PASSED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'QUOTA_REJECTED',
  'TECHNICAL_ERROR',
]);
const DENIED = new Set(['FAILED', 'CANCELLED', 'EXPIRED', 'QUOTA_REJECTED']);
const TECHNICAL = new Set([
  GRIP_CHECK_REASON.PROVIDER_UNAVAILABLE,
  GRIP_CHECK_REASON.PROVIDER_TIMEOUT,
  GRIP_CHECK_REASON.INVALID_BOARD,
  GRIP_CHECK_REASON.INVALID_GRADE,
  GRIP_CHECK_REASON.OPERATION_FAILED,
]);

class HostedProtocolError extends Error {}
class HostedHttpError extends Error {
  constructor(status, retryAfter) {
    super('Hosted Grip HTTP error');
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function isTechnical(error) {
  return error instanceof HostedHttpError
    ? error.status >= 500
    : error instanceof TypeError || error?.name === 'TimeoutError';
}

function validateStatus(value, digest, checkId) {
  if (
    !value ||
    typeof value !== 'object' ||
    !/^[A-Za-z0-9_-]{43}$/.test(value.checkId ?? '') ||
    (checkId && value.checkId !== checkId) ||
    !STATES.has(value.state) ||
    value.bindingDigest !== digest ||
    value.policyVersion !== GRIP_HOSTED_POLICY.VERSION ||
    !Number.isFinite(Date.parse(value.expiresAt)) ||
    !Number.isFinite(Date.parse(value.passValidUntil))
  ) {
    throw new HostedProtocolError('Hosted Grip response does not match the push or policy');
  }

  if (
    value.state === 'PASSED' &&
    (!Number.isInteger(value.score) ||
      value.score < GRIP_HOSTED_POLICY.PASSING_SCORE ||
      value.score > 100 ||
      Date.parse(value.passValidUntil) <= Date.now())
  ) {
    throw new HostedProtocolError('Hosted Grip pass is invalid or expired');
  }

  return value;
}

function decision(status, logger) {
  if (status.state === 'PASSED') {
    logger('[grip] Server defense passed for this push.');

    return 0;
  }

  if (DENIED.has(status.state)) {
    logger(`[grip] Push blocked: ${status.state}.`);

    return 1;
  }

  if (status.state === 'TECHNICAL_ERROR') {
    if (!TECHNICAL.has(status.reason)) {
      throw new HostedProtocolError('Unknown hosted Grip technical reason');
    }

    logger(
      `[grip] UNVERIFIED: technical failure (${status.reason}); temporary fail-open permits this push, not a passed defense.`,
    );

    return 0;
  }

  return undefined;
}

export async function runHostedPush({
  settings,
  collected,
  signal,
  fetchFn = fetch,
  openBrowser = launchBrowser,
  logger = console.info,
  wait = (duration, abortSignal) => delay(duration, undefined, { signal: abortSignal }),
}) {
  if (signal?.aborted) return 1;

  let frontendOrigin;

  try {
    const parsed = new URL(settings.frontendOrigin);
    const loopback = ['localhost', '127.0.0.1'].includes(parsed.hostname);

    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash ||
      (parsed.protocol !== 'https:' && !(loopback && parsed.protocol === 'http:'))
    )
      throw new Error('Invalid origin');

    frontendOrigin = parsed.origin;
  } catch {
    logger('[grip] Push blocked: hosted frontend origin is missing or invalid.');

    return 1;
  }

  if (collected.truncated) {
    logger(
      '[grip] Truncated defense: only the uploaded portion is reviewed; omitted changes are not covered.',
    );
  }

  const digest = await createGripBindingDigest(collected.manifest);
  const requestId = randomUUID();
  const deadline = Date.now() + GRIP_HOSTED_POLICY.DEFENSE_TTL_MS;
  let effectiveDeadline = deadline;
  const input = {
    requestId,
    intentCreatedAt: new Date().toISOString(),
    manifest: collected.manifest,
    diff: collected.diff,
    files: collected.files,
    truncated: collected.truncated,
  };
  let checkId;

  const request = async (route, body, timeoutMs = 10_000) => {
    const requestSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);
    const response = await fetchFn(`${settings.gatewayOrigin}/dev-tools/grip/${route}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${settings.token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      signal: requestSignal,
    });

    if (!response.ok)
      throw new HostedHttpError(response.status, response.headers.get('Retry-After'));

    try {
      return await response.json();
    } catch {
      throw new HostedProtocolError('Malformed hosted Grip response');
    }
  };

  try {
    let response;

    try {
      response = await request('checks', input);
    } catch (error) {
      if (!isTechnical(error) || signal?.aborted) throw error;

      response = await request('checks', input);
    }

    const created = validateStatus(response, digest);

    checkId = created.checkId;
    const result = decision(created, logger);

    if (result !== undefined) return result;

    effectiveDeadline = Math.min(deadline, Date.parse(created.expiresAt));

    let boardUrl;

    try {
      boardUrl = new URL(created.boardUrl);
    } catch {
      throw new HostedProtocolError('Invalid hosted whiteboard URL');
    }

    if (
      (boardUrl.protocol !== 'https:' &&
        !(
          ['localhost', '127.0.0.1'].includes(boardUrl.hostname) && boardUrl.protocol === 'http:'
        )) ||
      boardUrl.username ||
      boardUrl.password ||
      boardUrl.search ||
      boardUrl.hash ||
      boardUrl.origin !== frontendOrigin ||
      boardUrl.pathname !== `/dev-tools/grip/boards/${created.checkId}`
    ) {
      throw new HostedProtocolError('Invalid hosted whiteboard URL');
    }

    logger(`[grip] Defend this push: ${boardUrl.href}`);
    logger(
      '[grip] Sign in using the GitHub account enrolled in Grip. The original push is waiting.',
    );

    try {
      openBrowser(boardUrl.href);
    } catch {
      logger('[grip] Open the printed URL manually.');
    }

    let generated;

    try {
      generated = validateStatus(
        await request(`checks/${checkId}/generation`, {}, 125_000),
        digest,
        checkId,
      );
    } catch (error) {
      if (!isTechnical(error) || signal?.aborted) throw error;

      logger(
        '[grip] Generation response lost; reading the existing check without dispatching again.',
      );
    }

    const generatedResult = generated ? decision(generated, logger) : undefined;

    if (generatedResult !== undefined) return generatedResult;

    while (Date.now() < effectiveDeadline) {
      let response;

      try {
        response = await request(`checks/${checkId}/status`);
      } catch (error) {
        if (!(error instanceof HostedHttpError) || error.status !== 429) throw error;

        const seconds = Number(error.retryAfter);
        const duration =
          Number.isFinite(seconds) && seconds > 0
            ? Math.min(60_000, Math.ceil(seconds * 1000))
            : GRIP_HOSTED_POLICY.POLL_INTERVAL_MS;

        await wait(duration, signal);
        continue;
      }

      const status = validateStatus(response, digest, checkId);
      const statusResult = decision(status, logger);

      if (statusResult !== undefined) return statusResult;

      await wait(GRIP_HOSTED_POLICY.POLL_INTERVAL_MS, signal);
    }

    logger('[grip] Defense expired; push blocked.');

    return 1;
  } catch (error) {
    if (signal?.aborted && checkId) {
      try {
        await fetchFn(`${settings.gatewayOrigin}/dev-tools/grip/checks/${checkId}/cancellation`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${settings.token}` },
          redirect: 'error',
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        logger('[grip] Cancellation could not reach the server; the check will expire.');
      }
    }

    if (signal?.aborted || Date.now() >= effectiveDeadline || !isTechnical(error)) {
      logger('[grip] Push blocked: authentication, policy, validation or cancellation failure.');

      return 1;
    }

    logger(
      '[grip] UNVERIFIED: hosted service unavailable; temporary fail-open permits this push. No passed result is recorded.',
    );

    return 0;
  }
}
