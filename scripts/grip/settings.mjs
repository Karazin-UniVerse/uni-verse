import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Validates gateway URL ensuring HTTPS or loopback, without userinfo, query, or hash.
 * @param {string} urlString
 * @returns {string} Normalized gateway origin
 */
export function validateGatewayUrl(urlString) {
  let parsed;

  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`Invalid gateway URL: ${urlString}`);
  }

  if (parsed.username || parsed.password) {
    throw new Error('Gateway URL must not contain username or password');
  }

  if (parsed.search) {
    throw new Error('Gateway URL must not contain query parameters');
  }

  if (parsed.hash) {
    throw new Error('Gateway URL must not contain a URL fragment');
  }

  const isLoopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

  if (parsed.protocol === 'http:') {
    if (!isLoopback) {
      throw new Error(
        `Insecure HTTP gateway is only permitted on loopback (got ${parsed.hostname})`,
      );
    }
  } else if (parsed.protocol !== 'https:') {
    throw new Error(
      `Unsupported protocol: ${parsed.protocol}. Only HTTPS (or HTTP loopback) is permitted`,
    );
  }

  return `${parsed.protocol}//${parsed.host}`;
}

/**
 * Validates gateway token format: ugr_ prefix followed by 43 base64url characters.
 * @param {string} token
 * @returns {boolean}
 */
export function validateTokenFormat(token) {
  return typeof token === 'string' && /^ugr_[A-Za-z0-9_-]{43}$/.test(token);
}

/**
 * Resolves the configuration directory for Grip settings.
 * @param {{ configDir?: string }} [options]
 * @returns {string}
 */
export function getSettingsDir(options = {}) {
  if (options.configDir) {
    return options.configDir;
  }

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');

    return path.join(appData, 'universe-grip');
  }

  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');

  return path.join(xdgConfig, 'universe-grip');
}

/**
 * Resolves the path to the settings file for a specific repository root.
 * @param {{ configDir?: string; repoRoot?: string }} [options]
 * @returns {string}
 */
export function getSettingsPath(options = {}) {
  const dir = getSettingsDir(options);
  const targetRoot = path.resolve(options.repoRoot || process.cwd());
  const hash = crypto.createHash('sha256').update(targetRoot).digest('hex');

  return path.join(dir, `${hash}.json`);
}

/**
 * Atomically saves Grip settings for a repository.
 * @param {Record<string, unknown>} settings
 * @param {{ configDir?: string }} [options]
 * @returns {Promise<void>}
 */
export async function saveSettings(settings, options = {}) {
  const targetRoot = path.resolve(settings.repoRoot || process.cwd());
  const filePath = getSettingsPath({ configDir: options.configDir, repoRoot: targetRoot });
  const dir = path.dirname(filePath);

  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });

  const tempPath = path.join(
    dir,
    `settings-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.tmp`,
  );
  const content = JSON.stringify(settings, null, 2);

  await fs.promises.writeFile(tempPath, content, { mode: 0o600 });
  await fs.promises.rename(tempPath, filePath);
}

/**
 * Loads Grip settings for a repository. Returns null if not found, expired, or for a foreign repository.
 * @param {{ configDir?: string; repoRoot?: string }} [options]
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadSettings(options = {}) {
  const targetRoot = path.resolve(options.repoRoot || process.cwd());
  const filePath = getSettingsPath({ configDir: options.configDir, repoRoot: targetRoot });

  let raw;

  try {
    raw = await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'Grip enrollment file is corrupt or unreadable. Run pnpm grip:setup to re-enroll',
    );
  }

  if (parsed.repoRoot && path.resolve(parsed.repoRoot) !== targetRoot) {
    return null;
  }

  if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
    throw new Error('Grip gateway enrollment has expired. Run pnpm grip:setup to re-enroll');
  }

  return parsed;
}

/**
 * Removes Grip settings for a repository.
 * @param {{ configDir?: string; repoRoot?: string }} [options]
 * @returns {Promise<void>}
 */
export async function removeSettings(options = {}) {
  const targetRoot = path.resolve(options.repoRoot || process.cwd());
  const filePath = getSettingsPath({ configDir: options.configDir, repoRoot: targetRoot });

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}
