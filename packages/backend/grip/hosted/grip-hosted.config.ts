import { ForbiddenException } from '@nestjs/common';
import type { GripHostedConfig } from './grip-hosted.types';

const KEY_BYTES = 32;
const MAX_KEY_VERSIONS = 4;

function configError(): never {
  throw new ForbiddenException('Hosted Grip is disabled or misconfigured');
}

function requireValue(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();

  if (!value) {
    return configError();
  }

  return value;
}

function secureUrl(value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return configError();
  }

  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:'))
  ) {
    return configError();
  }

  return url;
}

function readKeyring(raw: string): ReadonlyMap<string, Buffer> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return configError();
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return configError();
  }

  const entries = Object.entries(parsed);
  const encodedNames = [...raw.matchAll(/"(?:[^"\\]|\\.)*"\s*:/g)];

  if (
    !entries.length ||
    entries.length > MAX_KEY_VERSIONS ||
    encodedNames.length !== entries.length
  ) {
    return configError();
  }

  const keys = new Map<string, Buffer>();

  for (const [version, encoded] of entries) {
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(version) || typeof encoded !== 'string') {
      return configError();
    }

    const key = Buffer.from(encoded, 'base64');

    if (key.length !== KEY_BYTES || key.toString('base64') !== encoded) {
      return configError();
    }

    keys.set(version, key);
  }

  return keys;
}

export function getGripHostedConfig(
  env: NodeJS.ProcessEnv,
): GripHostedConfig | null {
  if (env.GRIP_HOSTED_ENABLED !== 'true') {
    return null;
  }

  if (env.GRIP_HOSTED_RETENTION_VERIFIED !== 'true') {
    return configError();
  }

  const originUrl = secureUrl(requireValue(env, 'GRIP_HOSTED_FRONTEND_ORIGIN'));

  if (originUrl.pathname !== '/') {
    return configError();
  }

  const encryptionKeys = readKeyring(requireValue(env, 'GRIP_CONTENT_KEYRING'));
  const activeKeyVersion = requireValue(env, 'GRIP_CONTENT_ACTIVE_KEY_VERSION');
  const cleanupServiceAccountEmail = requireValue(
    env,
    'GRIP_CLEANUP_SERVICE_ACCOUNT_EMAIL',
  );
  const cleanupAudience = secureUrl(
    requireValue(env, 'GRIP_CLEANUP_OIDC_AUDIENCE'),
  ).href;

  if (
    !encryptionKeys.has(activeKeyVersion) ||
    !/^[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+\.iam\.gserviceaccount\.com$/.test(
      cleanupServiceAccountEmail,
    )
  ) {
    return configError();
  }

  return {
    frontendOrigin: originUrl.origin,
    callbackUrl: `${originUrl.origin}/dev-tools/grip/api/auth/callback`,
    oauthClientSecret: requireValue(env, 'GRIP_GITHUB_OAUTH_CLIENT_SECRET'),
    encryptionKeys,
    activeKeyVersion,
    cleanupAudience,
    cleanupServiceAccountEmail,
  };
}
