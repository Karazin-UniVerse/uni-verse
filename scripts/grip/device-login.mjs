import { spawn } from 'node:child_process';

/**
 * Launches the system default browser with the given URL.
 * @param {string} url
 * @param {typeof spawn} [spawnFn]
 */
export function launchBrowser(url, spawnFn = spawn) {
  try {
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const cmd = isMac ? 'open' : isWindows ? 'cmd.exe' : 'xdg-open';
    const args = isWindows ? ['/c', 'start', '""', url] : [url];

    const child = spawnFn(cmd, args, { stdio: 'ignore', detached: true });

    if (child && typeof child.unref === 'function') {
      child.unref();
    }
  } catch {
    // Non-critical if browser launch fails
  }
}

/**
 * Asynchronously waits for a specified delay, respecting an optional AbortSignal.
 * @param {number} ms
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason || new Error('Aborted'));

      return;
    }

    const timer = setTimeout(() => {
      resolve();
    }, ms);

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(signal.reason || new Error('Aborted'));
        },
        { once: true },
      );
    }
  });
}

/**
 * Executes the GitHub OAuth Device Flow to retrieve an access token.
 * @param {{
 *   clientId: string;
 *   signal?: AbortSignal;
 *   githubBaseUrl?: string;
 *   logger?: (message: string) => void;
 * }} options
 * @returns {Promise<string>} GitHub OAuth access token
 */
export async function loginDevice({
  clientId,
  openBrowserFn,
  signal,
  githubBaseUrl = 'https://github.com',
  logger = console.info,
  openBrowser = true,
}) {
  const baseUrl = githubBaseUrl.replace(/\/+$/, '');
  const codeEndpoint = `${baseUrl}/login/device/code`;

  const codeRes = await fetch(codeEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: '',
    }),
    signal,
  });

  if (!codeRes.ok) {
    const errorText = await codeRes.text().catch(() => '');

    throw new Error(`Failed to request GitHub device code: ${codeRes.status} ${errorText}`);
  }

  const codeData = await codeRes.json();
  const {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: verificationUri,
    interval,
  } = codeData;

  if (!deviceCode || !userCode || !verificationUri) {
    throw new Error('Unexpected response format from GitHub device authorization endpoint');
  }

  logger(
    `\nTo authenticate Grip with GitHub, visit:\n  ${verificationUri}\nEnter one-time code: ${userCode}\n`,
  );

  if (openBrowser) {
    if (typeof openBrowserFn === 'function') {
      try {
        openBrowserFn(verificationUri);
      } catch {
        // Ignored
      }
    } else if (!process.env.NODE_TEST_CONTEXT && process.stdout.isTTY) {
      try {
        launchBrowser(verificationUri);
        logger(`Opening ${verificationUri} in your default browser...`);
      } catch {
        // Ignored
      }
    }
  }

  let pollIntervalMs = Math.max(1, interval || 5) * 1000;
  const pollEndpoint = `${baseUrl}/login/oauth/access_token`;

  while (!signal?.aborted) {
    await sleep(pollIntervalMs, signal);

    const tokenRes = await fetch(pollEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
      signal,
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text().catch(() => '');

      throw new Error(`GitHub token exchange request failed: ${tokenRes.status} ${errorText}`);
    }

    const tokenData = await tokenRes.json();

    if (tokenData.access_token) {
      return tokenData.access_token;
    }

    if (tokenData.error === 'authorization_pending') {
      continue;
    }

    if (tokenData.error === 'slow_down') {
      pollIntervalMs += 5000;
      continue;
    }

    if (tokenData.error === 'access_denied') {
      throw new Error('Access was denied by the user');
    }

    if (tokenData.error === 'expired_token') {
      throw new Error('Device code has expired. Please run setup again');
    }

    throw new Error(`GitHub device login error: ${tokenData.error_description || tokenData.error}`);
  }

  throw signal?.reason || new Error('Device login aborted');
}
