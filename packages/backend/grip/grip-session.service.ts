import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { GripSessionResponse } from '@universe/core/types/grip';
import { GithubClientService } from './github-client.service';
import { GRIP_SESSION_TTL_MS, GRIP_TOKEN_PREFIX } from './grip.constants';
import { GripQuotaService } from './grip-quota.service';
import { GripStorageService } from './grip-storage.service';
import type { ExchangeSessionParams, GripPrincipal } from './grip.types';

const TOKEN_REGEX = /^ugr_[A-Za-z0-9_-]{43}$/;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class GripSessionService {
  constructor(
    private readonly storage: GripStorageService,
    private readonly githubClient: GithubClientService,
    private readonly quotaService: GripQuotaService,
  ) {}

  async exchange({
    githubToken,
    clientIp,
  }: ExchangeSessionParams): Promise<GripSessionResponse> {
    await this.quotaService.reserveSessionExchange(clientIp);

    const identity = await this.githubClient.identify(githubToken);

    await this.githubClient.assertWriter(identity);

    const tokenBytes = randomBytes(32).toString('base64url');
    const token = `${GRIP_TOKEN_PREFIX}${tokenBytes}`;
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + GRIP_SESSION_TTL_MS);

    await this.storage.createSession({
      tokenHash,
      githubId: identity.githubId,
      githubLogin: identity.login,
      expiresAt,
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async authenticate(token: string): Promise<GripPrincipal> {
    if (!TOKEN_REGEX.test(token)) {
      throw new UnauthorizedException('Invalid token format');
    }

    const tokenHash = hashToken(token);
    const session = await this.storage.findSession(tokenHash);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired gateway session');
    }

    await this.githubClient.assertWriter({
      githubId: session.githubId,
      login: session.githubLogin,
    });

    return {
      githubId: session.githubId,
      login: session.githubLogin,
      sessionId: session.id,
    };
  }

  async revoke(token: string): Promise<void> {
    if (!TOKEN_REGEX.test(token)) {
      return;
    }

    const tokenHash = hashToken(token);
    const session = await this.storage.findSession(tokenHash);

    if (session) {
      await this.storage.revokeSession(session.id);
    }
  }
}
