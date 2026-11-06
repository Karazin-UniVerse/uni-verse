import type { GripCheckReason, GripCheckState, GripPinKind } from '../constants/grip-hosted';

export interface GripPushUpdate {
  localRef: string;
  localOid: string;
  remoteRef: string;
  remoteOid: string;
}

export interface GripPushManifest {
  repository: string;
  updates: GripPushUpdate[];
  policyVersion: string;
  diffDigest: string;
}

export interface GripCreateCheckRequest {
  requestId: string;
  intentCreatedAt: string;
  manifest: GripPushManifest;
  diff: string;
  files: string[];
  truncated: boolean;
}

export interface GripCheckStatus {
  checkId: string;
  state: GripCheckState;
  bindingDigest: string;
  expiresAt: string;
  passValidUntil: string;
  policyVersion: string;
  score?: number;
  reason?: GripCheckReason;
}

export interface GripCreatedCheck extends GripCheckStatus {
  boardUrl: string;
}

export interface GripBoardNode {
  id: string;
  label: string;
  role: string;
  kind: 'component' | 'store' | 'external' | 'context';
  trust: 'trusted' | 'untrusted';
  files: string[];
}

export interface GripBoardEdge {
  source: string;
  target: string;
  label: string;
}

export interface GripBoardQuestion {
  id: string;
  on: string;
  kind: GripPinKind;
  question: string;
}

export interface GripPublicBoard {
  revision: string;
  summary: string;
  nodes: GripBoardNode[];
  edges: GripBoardEdge[];
  questions: GripBoardQuestion[];
}

export interface GripGradeFeedback {
  questionId: string;
  score: number;
  feedback: string;
}

export interface GripCheckView extends GripCheckStatus {
  manifest: GripPushManifest;
  diff: string;
  truncated: boolean;
  board?: GripPublicBoard;
  feedback?: GripGradeFeedback[];
}

export interface GripSubmissionRequest {
  requestId: string;
  boardRevision: string;
  answers: GripAnswer[];
}

export interface GripAnswer {
  questionId: string;
  answer: string;
}

export interface GripBrowserLoginRequest {
  browserBinding: string;
  returnCheckId: string;
}

export interface GripBrowserCallbackRequest {
  browserBinding: string;
  state: string;
  code: string;
  previousSession?: string;
}

export interface GripBrowserIdentity {
  githubId: string;
  login: string;
  expiresAt: string;
  csrfToken: string;
}
