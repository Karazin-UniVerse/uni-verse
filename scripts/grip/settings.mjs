import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import childProcess from 'node:child_process';

export const GRIP_REPOSITORY = 'Karazin-UniVerse/uni-verse';
const SSH_CONFIG_TIMEOUT_MS = 5000;
const HTTPS_REMOTE = /^https:\/\/github\.com\/Karazin-UniVerse\/uni-verse(?:\.git)?\/?$/i;
const SSH_REMOTE =
  /^(?:git@([a-z0-9_][a-z0-9._-]*):|ssh:\/\/git@([a-z0-9_][a-z0-9._-]*)(?::(22|443))?\/)Karazin-UniVerse\/uni-verse(?:\.git)?\/?$/i;

// Git's shell finds the OpenSSH bundled with Git for Windows. Match Git's
// precedence for configured shell commands and the GIT_SSH executable.
const SSH_CONFIG_ALIAS = [
  'alias.grip-ssh-config=!f() {',
  'if [ "${GIT_SSH_COMMAND+x}" ]; then ssh_command=$GIT_SSH_COMMAND;',
  'elif ssh_command=$(git config --get core.sshCommand); then :;',
  'else exec "${GIT_SSH-ssh}" -G "$@"; fi;',
  '[ -n "$ssh_command" ] || exit 1;',
  'exec sh -c "$ssh_command -G \\"\\$@\\"" grip-ssh "$@";',
  '}; f',
].join(' ');
const SSH_IDENTITY_FIELDS = new Set(['hostname', 'user', 'port']);

function isGitHubSshEndpoint(host, port) {
  return (host === 'github.com' && port === '22') || (host === 'ssh.github.com' && port === '443');
}

function isAllowedRemote(remoteUrl, repoRoot) {
  if (typeof remoteUrl !== 'string' || remoteUrl !== remoteUrl.trim()) {
    return false;
  }

  if (HTTPS_REMOTE.test(remoteUrl)) {
    return true;
  }

  if (!remoteUrl.startsWith('git@') && !remoteUrl.startsWith('ssh://git@')) {
    return false;
  }

  const sshRemote = SSH_REMOTE.exec(remoteUrl);

  if (!sshRemote) {
    return false;
  }

  const host = sshRemote[1] ?? sshRemote[2];
  const port = sshRemote[3];

  if (isGitHubSshEndpoint(host.toLowerCase(), port ?? '22')) {
    return true;
  }

  const args = [
    '-c',
    SSH_CONFIG_ALIAS,
    'grip-ssh-config',
    ...(port ? ['-p', port] : []),
    'git@' + host,
  ];
  const result = childProcess.spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: SSH_CONFIG_TIMEOUT_MS,
  });

  if (result.error || result.status !== 0 || !result.stdout) {
    return false;
  }

  const config = new Map();

  for (const line of result.stdout.split(/\r?\n/)) {
    const [key, value, extra] = line.trim().split(/\s+/);

    if (!SSH_IDENTITY_FIELDS.has(key)) {
      continue;
    }

    if (!value || extra || config.has(key)) {
      return false;
    }

    config.set(key, value);
  }

  return (
    config.get('user') === 'git' &&
    (!port || config.get('port') === port) &&
    isGitHubSshEndpoint(config.get('hostname')?.toLowerCase(), config.get('port'))
  );
}

export function validateRepository({ remoteUrl, repoRoot = process.cwd() } = {}) {
  const result = childProcess.spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const origin = result.stdout?.trim();

  if (
    result.status !== 0 ||
    !origin ||
    !isAllowedRemote(origin, repoRoot) ||
    (remoteUrl !== undefined && remoteUrl !== origin && !isAllowedRemote(remoteUrl, repoRoot))
  ) {
    throw new Error(`Grip enrollment is restricted to the ${GRIP_REPOSITORY} repository.`);
  }
}

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

  if (parsed.pathname !== '/') {
    throw new Error('Gateway URL must be an origin without a path');
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
 * Resolves the current user's shared UniVerse gateway profile.
 * @param {{ configDir?: string }} [options]
 * @returns {string}
 */
export function getSettingsPath(options = {}) {
  const dir = getSettingsDir(options);

  return path.join(dir, 'gateway.json');
}

/**
 * Atomically saves the shared gateway profile after validating repository identity.
 * @param {Record<string, unknown>} settings
 * @param {{ configDir?: string; repoRoot?: string }} [options]
 * @returns {Promise<void>}
 */
export async function saveSettings(settings, options = {}) {
  await publishSettings(settings, options, false);
}

async function publishSettings(settings, options, exclusive) {
  validateRepository(options);

  const filePath = getSettingsPath(options);
  const dir = path.dirname(filePath);

  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });

  const tempPath = path.join(
    dir,
    `settings-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.tmp`,
  );
  const content = JSON.stringify(settings, null, 2);

  await fs.promises.writeFile(tempPath, content, { mode: 0o600 });

  try {
    if (exclusive) {
      await fs.promises.link(tempPath, filePath);
    } else {
      await fs.promises.rename(tempPath, filePath);
    }
  } finally {
    await fs.promises.rm(tempPath, { force: true });
  }
}

/**
 * Loads shared settings. Only an absent profile returns null; invalid profiles fail closed.
 * @param {{ configDir?: string; repoRoot?: string; remoteUrl?: string }} [options]
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadSettings(options = {}) {
  const raw = await readSettingsFile(getSettingsPath(options));

  if (raw === null) {
    return null;
  }

  validateRepository(options);

  return parseSettings(raw);
}

async function readSettingsFile(filePath) {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

function parseSettings(raw, legacyRoot) {
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'Grip enrollment file is corrupt or unreadable. Run pnpm grip:setup to re-enroll',
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Grip enrollment file is invalid or empty. Run pnpm grip:setup to re-enroll');
  }

  if (parsed.version !== (legacyRoot ? 1 : 2)) {
    throw new Error(
      `Unsupported Grip enrollment version: ${parsed.version}. Run pnpm grip:setup to re-enroll`,
    );
  }

  if (legacyRoot && (!parsed.repoRoot || path.resolve(parsed.repoRoot) !== legacyRoot)) {
    throw new Error(
      'Grip enrollment does not match this checkout. Run pnpm grip:setup to re-enroll',
    );
  }

  if (!legacyRoot && parsed.repository !== GRIP_REPOSITORY) {
    throw new Error('Grip enrollment repository is invalid. Run pnpm grip:setup to re-enroll');
  }

  try {
    validateGatewayUrl(parsed.gatewayOrigin);
  } catch {
    throw new Error('Grip enrollment gateway URL is invalid. Run pnpm grip:setup to re-enroll');
  }

  if (!validateTokenFormat(parsed.token)) {
    throw new Error('Grip enrollment token is invalid. Run pnpm grip:setup to re-enroll');
  }

  if (typeof parsed.clientId !== 'string' || !parsed.clientId.trim()) {
    throw new Error('Grip enrollment OAuth client is invalid. Run pnpm grip:setup to re-enroll');
  }

  const expiresTime = parsed.expiresAt ? new Date(parsed.expiresAt).getTime() : NaN;

  if (Number.isNaN(expiresTime)) {
    throw new Error('Grip enrollment expiration date is invalid. Run pnpm grip:setup to re-enroll');
  }

  if (expiresTime <= Date.now()) {
    throw new Error('Grip gateway enrollment has expired. Run pnpm grip:setup to re-enroll');
  }

  return parsed;
}

export async function migrateSettings({
  gatewayOrigin,
  clientId,
  configDir,
  repoRoot = process.cwd(),
}) {
  const targetRoot = path.resolve(repoRoot);
  const normalizedGateway = validateGatewayUrl(gatewayOrigin);

  validateRepository({ repoRoot: targetRoot });

  const shared = await loadSettings({ configDir, repoRoot: targetRoot });

  if (shared) {
    throw new Error(
      'A shared Grip enrollment already exists. Use grip:status or explicitly re-enroll.',
    );
  }

  const hash = crypto.createHash('sha256').update(targetRoot).digest('hex');
  const legacyPath = path.join(getSettingsDir({ configDir }), `${hash}.json`);
  const raw = await readSettingsFile(legacyPath);

  if (raw === null) {
    throw new Error('No checkout enrollment to migrate. Run grip:setup without --migrate.');
  }

  const legacy = parseSettings(raw, targetRoot);

  if (
    validateGatewayUrl(legacy.gatewayOrigin) !== normalizedGateway ||
    legacy.clientId !== clientId
  ) {
    throw new Error('Migration gateway and OAuth client must match the existing enrollment.');
  }

  const settings = {
    version: 2,
    repository: GRIP_REPOSITORY,
    gatewayOrigin: normalizedGateway,
    clientId,
    token: legacy.token,
    expiresAt: legacy.expiresAt,
    executable: legacy.executable,
  };

  try {
    await publishSettings(settings, { configDir, repoRoot: targetRoot }, true);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(
        'A shared Grip enrollment was created concurrently; the old enrollment was kept.',
      );
    }

    throw error;
  }

  try {
    await fs.promises.unlink(legacyPath);
  } catch (error) {
    console.warn(
      `Shared enrollment is active, but the old checkout file could not be removed (${error.code}). ` +
        `Delete only the old file at ${legacyPath}; do not run grip:remove, which revokes the migrated token.`,
    );
  }

  return settings;
}

/**
 * Removes shared settings for all UniVerse worktrees of the current OS user.
 * @param {{ configDir?: string; repoRoot?: string }} [options]
 * @returns {Promise<void>}
 */
export async function removeSettings(options = {}) {
  validateRepository(options);

  const filePath = getSettingsPath(options);

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}
