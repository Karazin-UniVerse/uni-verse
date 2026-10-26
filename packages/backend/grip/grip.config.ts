import { ServiceUnavailableException } from '@nestjs/common';
import { GRIP_ALLOWED_MODEL } from './grip.constants';
import type { GripConfig } from './grip.types';

export class GripConfigException extends ServiceUnavailableException {
  constructor(message: string) {
    super(message);
  }
}

function validateEndpointUrl(urlString: string, fieldName: string): void {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlString);
  } catch {
    throw new GripConfigException(
      `Grip gateway is enabled but misconfigured: invalid ${fieldName}`,
    );
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new GripConfigException(
      `Grip gateway is enabled but misconfigured: credentials not allowed in ${fieldName}`,
    );
  }

  const isLoopback =
    parsedUrl.hostname === 'localhost' ||
    parsedUrl.hostname === '127.0.0.1' ||
    parsedUrl.hostname === '::1';

  if (
    parsedUrl.protocol !== 'https:' &&
    (!isLoopback || parsedUrl.protocol !== 'http:')
  ) {
    throw new GripConfigException(
      `Grip gateway is enabled but misconfigured: ${fieldName} must use HTTPS`,
    );
  }
}

export function getGripConfig(env: NodeJS.ProcessEnv): GripConfig | null {
  if (env.GRIP_GATEWAY_ENABLED !== 'true') {
    return null;
  }

  const geminiApiKey = env.GEMINI_API_KEY?.trim();
  const geminiModel = env.GRIP_GEMINI_MODEL?.trim();
  const geminiBaseUrl = env.GRIP_GEMINI_BASE_URL?.trim();
  const githubApiUrl = env.GRIP_GITHUB_API_URL?.trim();
  const githubOAuthClientId = env.GRIP_GITHUB_OAUTH_CLIENT_ID?.trim();
  const githubPermissionToken = env.GRIP_GITHUB_PERMISSION_TOKEN?.trim();
  const githubOwner = env.GRIP_GITHUB_OWNER?.trim();
  const githubRepository = env.GRIP_GITHUB_REPOSITORY?.trim();

  if (
    !geminiApiKey ||
    !geminiModel ||
    !geminiBaseUrl ||
    !githubApiUrl ||
    !githubOAuthClientId ||
    !githubPermissionToken ||
    !githubOwner ||
    !githubRepository
  ) {
    throw new GripConfigException(
      'Grip gateway is enabled but misconfigured: missing required settings',
    );
  }

  if (geminiModel !== GRIP_ALLOWED_MODEL) {
    throw new GripConfigException(
      'Grip gateway is enabled but misconfigured: unsupported model configured',
    );
  }

  validateEndpointUrl(geminiBaseUrl, 'GRIP_GEMINI_BASE_URL');
  validateEndpointUrl(githubApiUrl, 'GRIP_GITHUB_API_URL');

  const trustedProxyAddresses = env.GRIP_TRUSTED_PROXY_ADDRESSES
    ? env.GRIP_TRUSTED_PROXY_ADDRESSES.split(',')
        .map((address: string) => address.trim())
        .filter(Boolean)
    : [];

  return {
    enabled: true,
    geminiApiKey,
    geminiModel,
    geminiBaseUrl,
    githubApiUrl,
    githubOAuthClientId,
    githubPermissionToken,
    githubOwner,
    githubRepository,
    trustedProxyAddresses,
  };
}
