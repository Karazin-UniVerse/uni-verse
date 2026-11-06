export interface GripHostedConfig {
  frontendOrigin: string;
  callbackUrl: string;
  oauthClientSecret: string;
  encryptionKeys: ReadonlyMap<string, Buffer>;
  activeKeyVersion: string;
  cleanupAudience: string;
  cleanupServiceAccountEmail: string;
}

export interface GripEncryptedContent {
  keyVersion: string;
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
}

export interface GripContentEncryptionContext {
  checkPublicId: string;
  payloadVersion: number;
  keyring: ReadonlyMap<string, Buffer>;
}

export interface GripEncryptContentParams extends GripContentEncryptionContext {
  plaintext: Buffer;
  keyVersion: string;
}

export interface GripDecryptContentParams extends GripContentEncryptionContext {
  content: GripEncryptedContent;
}

export interface GripClaimOperationParams {
  ownerGithubId: string;
  checkId: string;
  kind: 'generation' | 'grading';
  requestId: string;
  requestHash: string;
  timeoutMs: number;
}

export interface GripFinishOperationParams {
  checkId: string;
  operationId: string;
  expectedState: 'GENERATING' | 'GRADING';
  state: 'READY' | 'PASSED' | 'FAILED' | 'QUOTA_REJECTED' | 'TECHNICAL_ERROR';
  score?: number;
  reason?: string;
  boardRevision?: string;
  content?: GripEncryptedContent;
}

export interface GripBrowserLoginParams {
  config: GripHostedConfig;
  clientId: string;
  browserBinding: string;
  returnCheckId: string;
}

export interface GripBrowserCallbackParams {
  config: GripHostedConfig;
  clientId: string;
  browserBinding: string;
  state: string;
  code: string;
  previousSession?: string;
}

export interface GripCheckOwnerParams {
  ownerGithubId: string;
  checkId: string;
}

export interface GripCheckContext extends GripCheckOwnerParams {
  config: GripHostedConfig;
}

export interface GripCreateCheckParams {
  ownerGithubId: string;
  config: GripHostedConfig;
  input: GripCreateCheckRequest;
}

export interface GripSubmitCheckParams extends GripCheckContext {
  input: GripSubmissionRequest;
}

export interface GripStoredContent {
  input: GripCreateCheckRequest;
  board?: GripPrivateBoard;
  feedback?: GripGradeFeedback[];
}
import type {
  GripCreateCheckRequest,
  GripGradeFeedback,
  GripSubmissionRequest,
} from '@universe/core/types/grip-hosted';
import type { GripPrivateBoard } from './grip-board.types';
