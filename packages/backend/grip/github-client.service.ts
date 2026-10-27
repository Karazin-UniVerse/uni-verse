import {
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { getGripConfig } from './grip.config';
import type { GripConfig, GripIdentity } from './grip.types';

@Injectable()
export class GithubClientService {
  constructor(
    @Optional()
    @Inject('GRIP_CONFIG')
    private readonly injectedConfig?: GripConfig | null,
  ) {}

  private requireConfig(): GripConfig {
    if (this.injectedConfig) {
      return this.injectedConfig;
    }

    try {
      const config = getGripConfig(process.env);

      if (!config) {
        throw new ServiceUnavailableException(
          'Grip gateway is disabled or unconfigured',
        );
      }

      return config;
    } catch (error: unknown) {
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new ServiceUnavailableException('Grip gateway is misconfigured');
    }
  }

  async identify(accessToken: string): Promise<GripIdentity> {
    const config = this.requireConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${config.githubApiUrl}/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Karazin-UniVerse-Grip-Gateway',
        },
        redirect: 'error',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new UnauthorizedException('GitHub user authentication failed');
      }

      const data = await response.json();

      if (
        !data ||
        typeof data !== 'object' ||
        !('id' in data) ||
        !('login' in data)
      ) {
        throw new UnauthorizedException(
          'Malformed GitHub user profile response',
        );
      }

      return {
        githubId: String((data as { id: unknown }).id),
        login: String((data as { login: unknown }).login),
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'GitHub identity service unavailable',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async assertWriter(identity: GripIdentity): Promise<void> {
    const config = this.requireConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const encodedLogin = encodeURIComponent(identity.login);
      const url = `${config.githubApiUrl}/repos/${config.githubOwner}/${config.githubRepository}/collaborators/${encodedLogin}/permission`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.githubPermissionToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Karazin-UniVerse-Grip-Gateway',
        },
        redirect: 'error',
        signal: controller.signal,
      });

      if (response.status === 404) {
        throw new ForbiddenException(
          'User is not a collaborator on this repository',
        );
      }

      if (!response.ok) {
        throw new ServiceUnavailableException(
          'GitHub permission check unavailable',
        );
      }

      const data = (await response.json()) as {
        permission?: string;
        role_name?: string;
        user?: { id?: unknown; login?: unknown };
      };

      if (
        !data ||
        typeof data !== 'object' ||
        !data.user ||
        String(data.user.id) !== identity.githubId
      ) {
        throw new ForbiddenException('GitHub user identity mismatch');
      }

      const isWriter =
        data.permission === 'admin' ||
        data.permission === 'write' ||
        data.role_name === 'admin' ||
        data.role_name === 'write' ||
        data.role_name === 'maintain';

      if (!isWriter) {
        throw new ForbiddenException(
          'Repository write or admin permission required',
        );
      }
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'GitHub permission check unavailable',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
