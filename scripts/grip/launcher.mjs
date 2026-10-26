import { spawn } from 'node:child_process';
import fs from 'node:fs';

/**
 * Runs the Grip executable with gateway environment variables configured.
 * @param {{
 *   settings: Record<string, unknown> | null;
 *   args?: string[];
 *   spawnFn?: typeof spawn;
 *   signal?: AbortSignal;
 * }} options
 * @returns {Promise<number>} Exit code of the Grip process
 */
export async function runGripHook({ settings, signal, args = [], spawnFn = spawn }) {
  if (!settings) {
    throw new Error('Developer is not enrolled in Grip gateway. Run pnpm grip:setup');
  }

  if (settings.expiresAt && new Date(settings.expiresAt).getTime() <= Date.now()) {
    throw new Error('Grip gateway enrollment has expired. Run pnpm grip:setup to re-enroll');
  }

  if (!settings.executable || !fs.existsSync(settings.executable)) {
    throw new Error(`Grip executable not found at ${settings.executable}`);
  }

  const childEnv = { ...process.env };

  delete childEnv.GEMINI_API_KEY;

  const baseGateway = String(settings.gatewayOrigin || '').replace(/\/+$/, '');

  childEnv.GRIP_PROVIDER = 'openai';
  childEnv.GRIP_MODEL = 'gemini-3.5-flash-lite';
  childEnv.GRIP_BASE_URL = `${baseGateway}/dev-tools/grip/v1`;
  childEnv.GRIP_API_KEY_ENV = 'GRIP_GATEWAY_TOKEN';
  childEnv.GRIP_GATEWAY_TOKEN = String(settings.token || '');

  return new Promise((resolve, reject) => {
    const child = spawnFn(settings.executable, args, {
      shell: false,
      stdio: 'inherit',
      env: childEnv,
      signal,
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      resolve(code !== null ? code : 1);
    });
  });
}
