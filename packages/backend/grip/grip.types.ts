import type { GripCompletionRequest } from '@universe/core/types/grip';

export interface GripConfig {
  enabled: boolean;
  geminiApiKey: string;
  geminiModel: string;
  geminiBaseUrl: string;
  githubApiUrl: string;
  githubOAuthClientId: string;
  githubPermissionToken: string;
  githubOwner: string;
  githubRepository: string;
  trustedProxyAddresses: string[];
}

export interface GripIdentity {
  githubId: string;
  login: string;
}

export interface GripPrincipal {
  githubId: string;
  login: string;
  sessionId: string;
}

export interface GripStoredSession {
  id: string;
  tokenHash: string;
  githubId: string;
  githubLogin: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CompleteParams {
  principal: GripPrincipal;
  request: GripCompletionRequest;
  signal?: AbortSignal;
}
