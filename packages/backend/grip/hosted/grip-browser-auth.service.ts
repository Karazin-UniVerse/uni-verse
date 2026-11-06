import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import type { GripBrowserIdentity } from '@universe/core/types/grip-hosted';
import { PrismaService } from '../../prisma/prisma.service';
import { GithubClientService } from '../github-client.service';
import { decryptGripContent, encryptGripContent } from './grip-content-crypto';
import type {
  GripBrowserCallbackParams,
  GripBrowserLoginParams,
  GripHostedConfig,
} from './grip-hosted.types';

const OAUTH_TTL_MS = 10 * 60 * 1_000;
const SESSION_TTL_MS = 60 * 60 * 1_000;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PAYLOAD_VERSION = 1;

function hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

@Injectable()
export class GripBrowserAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubClientService,
  ) {}

  async startBrowserLogin({
    config,
    clientId,
    browserBinding,
    returnCheckId,
  }: GripBrowserLoginParams): Promise<{ authorizationUrl: string }> {
    if (
      !SECRET_PATTERN.test(browserBinding) ||
      !SECRET_PATTERN.test(returnCheckId) ||
      !clientId.trim()
    ) {
      throw new UnauthorizedException('Invalid Grip login request');
    }

    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const stateHash = hash(state);
    const encrypted = encryptGripContent({
      plaintext: Buffer.from(verifier),
      checkPublicId: stateHash,
      payloadVersion: PAYLOAD_VERSION,
      keyring: config.encryptionKeys,
      keyVersion: config.activeKeyVersion,
    });
    const now = new Date();

    await this.prisma.gripOAuthTransaction.create({
      data: {
        stateHash,
        browserHash: hash(browserBinding),
        returnCheckId,
        createdAt: now,
        expiresAt: new Date(now.getTime() + OAUTH_TTL_MS),
        secretKeyVersion: encrypted.keyVersion,
        secretIv: Uint8Array.from(encrypted.iv),
        secretTag: Uint8Array.from(encrypted.tag),
        secretCiphertext: Uint8Array.from(encrypted.ciphertext),
      },
    });
    const authorizationUrl = new URL(
      'https://github.com/login/oauth/authorize',
    );

    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: config.callbackUrl,
      state,
      scope: '',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      allow_signup: 'false',
    }).toString();

    return { authorizationUrl: authorizationUrl.href };
  }

  async completeBrowserLogin({
    config,
    clientId,
    browserBinding,
    state,
    code,
    previousSession,
  }: GripBrowserCallbackParams): Promise<{
    token: string;
    identity: GripBrowserIdentity;
    returnCheckId: string;
  }> {
    if (
      !SECRET_PATTERN.test(state) ||
      !SECRET_PATTERN.test(browserBinding) ||
      (previousSession !== undefined &&
        !SECRET_PATTERN.test(previousSession)) ||
      !code ||
      code.length > 512
    ) {
      throw new UnauthorizedException('Invalid Grip authentication callback');
    }

    const transaction = await this.prisma.gripOAuthTransaction.findUnique({
      where: { stateHash: hash(state) },
    });

    if (
      !transaction ||
      transaction.consumedAt ||
      transaction.expiresAt <= new Date() ||
      transaction.browserHash !== hash(browserBinding)
    ) {
      throw new UnauthorizedException(
        'Grip login expired or is not owned by this browser',
      );
    }

    const consumed = await this.prisma.gripOAuthTransaction.updateMany({
      where: {
        id: transaction.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });

    if (consumed.count !== 1) {
      throw new UnauthorizedException('Grip login has already been used');
    }

    const verifier = decryptGripContent({
      content: {
        keyVersion: transaction.secretKeyVersion,
        iv: Buffer.from(transaction.secretIv),
        tag: Buffer.from(transaction.secretTag),
        ciphertext: Buffer.from(transaction.secretCiphertext),
      },
      checkPublicId: transaction.stateHash,
      payloadVersion: PAYLOAD_VERSION,
      keyring: config.encryptionKeys,
    }).toString('utf8');
    const githubToken = await this.github.exchangeAuthorizationCode({
      code,
      redirectUri: config.callbackUrl,
      codeVerifier: verifier,
      clientId,
      clientSecret: config.oauthClientSecret,
    });
    const identity = await this.github.identify(githubToken);

    await this.github.assertWriter(identity);
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    const tokenHash = hash(token);
    const encrypted = encryptGripContent({
      plaintext: Buffer.from(csrfToken),
      checkPublicId: tokenHash,
      payloadVersion: PAYLOAD_VERSION,
      keyring: config.encryptionKeys,
      keyVersion: config.activeKeyVersion,
    });
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.prisma.$transaction(async (transaction) => {
      if (previousSession) {
        await transaction.gripBrowserSession.updateMany({
          where: { tokenHash: hash(previousSession), revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      await transaction.gripBrowserSession.create({
        data: {
          tokenHash,
          githubId: identity.githubId,
          githubLogin: identity.login,
          csrfHash: hash(csrfToken),
          expiresAt,
          secretKeyVersion: encrypted.keyVersion,
          secretIv: Uint8Array.from(encrypted.iv),
          secretTag: Uint8Array.from(encrypted.tag),
          secretCiphertext: Uint8Array.from(encrypted.ciphertext),
        },
      });
    });

    return {
      token,
      identity: {
        githubId: identity.githubId,
        login: identity.login,
        csrfToken,
        expiresAt: expiresAt.toISOString(),
      },
      returnCheckId: transaction.returnCheckId,
    };
  }

  async authenticateBrowser({
    token,
    config,
  }: {
    token: string;
    config: GripHostedConfig;
  }): Promise<GripBrowserIdentity> {
    if (!SECRET_PATTERN.test(token)) {
      throw new UnauthorizedException('Invalid Grip browser session');
    }

    const session = await this.prisma.gripBrowserSession.findUnique({
      where: { tokenHash: hash(token) },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException(
        'Invalid or expired Grip browser session',
      );
    }

    await this.github.assertWriter({
      githubId: session.githubId,
      login: session.githubLogin,
    });
    const csrfToken = decryptGripContent({
      content: {
        keyVersion: session.secretKeyVersion,
        iv: Buffer.from(session.secretIv),
        tag: Buffer.from(session.secretTag),
        ciphertext: Buffer.from(session.secretCiphertext),
      },
      checkPublicId: session.tokenHash,
      payloadVersion: PAYLOAD_VERSION,
      keyring: config.encryptionKeys,
    }).toString('utf8');

    return {
      githubId: session.githubId,
      login: session.githubLogin,
      csrfToken,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  assertCsrf({
    identity,
    csrfToken,
    origin,
    config,
  }: {
    identity: GripBrowserIdentity;
    csrfToken: string;
    origin: string;
    config: GripHostedConfig;
  }): void {
    const expected = Buffer.from(hash(identity.csrfToken));
    const actual = Buffer.from(hash(csrfToken));

    if (
      origin !== config.frontendOrigin ||
      !SECRET_PATTERN.test(csrfToken) ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new ForbiddenException('Invalid Grip request origin or CSRF token');
    }
  }

  async revokeBrowserSession(token: string): Promise<void> {
    await this.prisma.gripBrowserSession.updateMany({
      where: { tokenHash: hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
