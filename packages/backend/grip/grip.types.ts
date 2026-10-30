import type { GripCompletionRequest } from '@universe/core/types/grip';
import type { HttpException } from '@nestjs/common';
import type { GeminiKeyPool } from './gemini-key-pool';

export interface GripConfig {
  enabled: boolean;
  geminiApiKeys: string[];
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

export interface ExchangeSessionParams {
  githubToken: string;
  clientIp: string;
}

export interface GeminiKeyReservation {
  slot: number;
  apiKey: string;
}

export interface GeminiKeyCooldownParams {
  slot: number;
  status?: number;
  retryAfter?: string | null;
}

export interface GeminiKeyState {
  apiKey: string;
  active: number;
  availableAfter: number;
}

export type GeminiAttemptOutcome =
  | 'http_error'
  | 'network_error'
  | 'read_error'
  | 'invalid_response'
  | 'timeout'
  | 'cancelled';

export interface GeminiFailureParams {
  exception: HttpException;
  retryable: boolean;
  outcome: GeminiAttemptOutcome;
  status?: number;
  retryAfter?: string | null;
}

export interface GeminiAttemptContext {
  url: string;
  payload: string;
  signal: AbortSignal;
  callerSignal?: AbortSignal;
}

export interface GeminiFailedAttemptParams {
  error: unknown;
  context: GeminiAttemptContext;
  pool: GeminiKeyPool;
  attempted: ReadonlySet<number>;
  slot: number;
  attempt: number;
  startedAt: number;
}

export interface GeminiExecuteAttemptParams {
  context: GeminiAttemptContext;
  request: GripCompletionRequest;
  pool: GeminiKeyPool;
  attempted: Set<number>;
  lastFailure?: HttpException;
  attempt?: number;
}
