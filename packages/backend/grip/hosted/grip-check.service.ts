import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GRIP_CHECK_REASON,
  GRIP_CHECK_STATE,
  GRIP_HOSTED_POLICY,
  GRIP_MODEL_FAILURE_REASON,
  type GripCheckReason,
} from '@universe/core/constants/grip-hosted';
import type {
  GripCheckStatus,
  GripCheckView,
  GripCreatedCheck,
} from '@universe/core/types/grip-hosted';
import type { GripCompletionRequest } from '@universe/core/types/grip';
import type { GripHostedCheck } from '@universe/database';
import { createGripBindingDigest } from '@universe/core/utils/grip-hosted';
import { GeminiClientService } from '../gemini-client.service';
import { GripQuotaService } from '../grip-quota.service';
import { GripConfigException } from '../grip.config';
import { GripCheckStorageService } from './grip-check-storage.service';
import { decryptGripContent, encryptGripContent } from './grip-content-crypto';
import {
  projectGripBoard,
  validateGripBoard,
  validateGripGrade,
} from './grip-board.validation';
import {
  createGripBoardRequest,
  createGripGradeRequest,
} from './grip-board.prompts';
import type {
  GripCheckContext,
  GripCheckOwnerParams,
  GripCreateCheckParams,
  GripHostedConfig,
  GripStoredContent,
  GripSubmitCheckParams,
} from './grip-hosted.types';

const PAYLOAD_VERSION = 1;

function hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function status(check: GripHostedCheck): GripCheckStatus {
  const state = Object.values(GRIP_CHECK_STATE).find(
    (value) => value === check.state,
  );
  const reason = Object.values(GRIP_CHECK_REASON).find(
    (value) => value === check.reason,
  );

  if (!state || (check.reason !== null && !reason)) {
    throw new ServiceUnavailableException('Invalid stored Grip check');
  }

  return {
    checkId: check.publicId,
    state,
    bindingDigest: check.bindingDigest,
    expiresAt: check.expiresAt.toISOString(),
    passValidUntil: check.passValidUntil.toISOString(),
    policyVersion: check.policyVersion,
    ...(check.score !== null ? { score: check.score } : {}),
    ...(reason ? { reason } : {}),
  };
}

function failure(error: unknown): {
  state: 'QUOTA_REJECTED' | 'TECHNICAL_ERROR';
  reason: GripCheckReason;
} {
  const reason =
    error && typeof error === 'object' && 'reason' in error
      ? error.reason
      : undefined;

  if (
    reason === GRIP_MODEL_FAILURE_REASON.CREDENTIAL_UNAVAILABLE ||
    error instanceof GripConfigException
  ) {
    return {
      state: 'QUOTA_REJECTED',
      reason: GRIP_CHECK_REASON.CREDENTIAL_UNAVAILABLE,
    };
  }

  if (reason === GRIP_MODEL_FAILURE_REASON.PROVIDER_QUOTA) {
    return {
      state: 'QUOTA_REJECTED',
      reason: GRIP_CHECK_REASON.PROVIDER_QUOTA,
    };
  }

  if (
    error instanceof HttpException &&
    error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
  ) {
    return { state: 'QUOTA_REJECTED', reason: GRIP_CHECK_REASON.TEAM_QUOTA };
  }

  return {
    state: 'TECHNICAL_ERROR',
    reason: GRIP_CHECK_REASON.PROVIDER_UNAVAILABLE,
  };
}

@Injectable()
export class GripCheckService {
  private readonly logger = new Logger(GripCheckService.name);
  constructor(
    private readonly storage: GripCheckStorageService,
    private readonly model: GeminiClientService,
    private readonly quota: GripQuotaService,
  ) {}

  async create({
    ownerGithubId,
    config,
    input,
  }: GripCreateCheckParams): Promise<GripCreatedCheck> {
    if (
      input.manifest.policyVersion !== GRIP_HOSTED_POLICY.VERSION ||
      hash(input.diff) !== input.manifest.diffDigest ||
      Buffer.byteLength(input.diff) > GRIP_HOSTED_POLICY.MAX_DIFF_BYTES
    ) {
      throw new BadRequestException('Invalid Grip diff binding or policy');
    }

    const bindingDigest = await createGripBindingDigest(input.manifest);
    const check = await this.storage.createOrReplay({
      ownerGithubId,
      requestId: input.requestId,
      requestHash: hash(JSON.stringify(input)),
      intentCreatedAt: new Date(input.intentCreatedAt),
      bindingDigest,
      policyVersion: input.manifest.policyVersion,
      content: (checkPublicId) =>
        encryptGripContent({
          plaintext: Buffer.from(JSON.stringify({ input })),
          checkPublicId,
          payloadVersion: PAYLOAD_VERSION,
          keyring: config.encryptionKeys,
          keyVersion: config.activeKeyVersion,
        }),
    });

    return {
      ...status(check),
      boardUrl: `${config.frontendOrigin}/dev-tools/grip/boards/${check.publicId}`,
    };
  }

  async readStatus(input: GripCheckOwnerParams): Promise<GripCheckStatus> {
    return status(await this.storage.readOwned(input));
  }

  private async content({
    ownerGithubId,
    checkId,
    config,
  }: GripCheckContext): Promise<GripStoredContent> {
    const encrypted = await this.storage.readContent({
      ownerGithubId,
      checkId,
    });
    const plaintext = decryptGripContent({
      content: encrypted,
      checkPublicId: checkId,
      payloadVersion: PAYLOAD_VERSION,
      keyring: config.encryptionKeys,
    });

    return JSON.parse(plaintext.toString('utf8')) as GripStoredContent;
  }

  private encrypt({
    content,
    checkId,
    config,
  }: {
    content: GripStoredContent;
    checkId: string;
    config: GripHostedConfig;
  }): ReturnType<typeof encryptGripContent> {
    return encryptGripContent({
      plaintext: Buffer.from(JSON.stringify(content)),
      checkPublicId: checkId,
      payloadVersion: PAYLOAD_VERSION,
      keyring: config.encryptionKeys,
      keyVersion: config.activeKeyVersion,
    });
  }

  async readView(context: GripCheckContext): Promise<GripCheckView> {
    const check = await this.storage.readOwned(context);
    const content = await this.content(context);
    const manifest = content.input.manifest;

    const publicStatus = status(check);

    return {
      ...publicStatus,
      manifest: {
        repository: manifest.repository,
        policyVersion: manifest.policyVersion,
        diffDigest: manifest.diffDigest,
        updates: manifest.updates.map(
          ({ localRef, localOid, remoteRef, remoteOid }) => ({
            localRef,
            localOid,
            remoteRef,
            remoteOid,
          }),
        ),
      },
      diff: content.input.diff,
      truncated: content.input.truncated,
      ...(content.board ? { board: projectGripBoard(content.board) } : {}),
      ...(['PASSED', 'FAILED'].includes(publicStatus.state) && content.feedback
        ? {
            feedback: content.feedback.map(
              ({ questionId, score, feedback }) => ({
                questionId,
                score,
                feedback,
              }),
            ),
          }
        : {}),
    };
  }

  private async completeModel({
    ownerGithubId,
    request,
    deadline,
  }: {
    ownerGithubId: string;
    request: GripCompletionRequest;
    deadline: Date;
  }): Promise<string> {
    const remaining = deadline.getTime() - Date.now();

    if (remaining <= 0) {
      throw new Error('Grip operation expired');
    }

    const { leaseId } = await this.quota.reserveCompletion(ownerGithubId);
    let completionError: unknown;
    let result: string | undefined;

    try {
      const remainingAfterAdmission = deadline.getTime() - Date.now();

      if (remainingAfterAdmission <= 0)
        throw new Error('Grip operation expired during admission');

      const response = await this.model.complete(
        request,
        AbortSignal.timeout(
          Math.min(
            GRIP_HOSTED_POLICY.GRADING_TIMEOUT_MS,
            remainingAfterAdmission,
          ),
        ),
      );

      result = response.choices[0].message.content;
    } catch (error: unknown) {
      completionError = error;
    }

    try {
      await this.quota.releaseCompletion(leaseId);
    } catch (error: unknown) {
      if (!completionError) throw error;

      this.logger.warn(
        'Grip quota lease release failed after a completion failure; preserving the primary outcome',
      );
    }

    if (completionError) throw completionError;

    return result!;
  }

  async generate(context: GripCheckContext): Promise<GripCheckStatus> {
    const operation = await this.storage.claimOperation({
      ...context,
      kind: 'generation',
      requestId: `generation:${context.checkId}`,
      requestHash: hash(context.checkId),
      timeoutMs: GRIP_HOSTED_POLICY.GENERATION_TIMEOUT_MS,
    });

    if (
      operation.kind !== 'claimed' ||
      !operation.operationId ||
      !operation.check.operationDeadline
    ) {
      return this.readStatus(context);
    }

    const claim = {
      checkId: context.checkId,
      operationId: operation.operationId,
      expectedState: 'GENERATING' as const,
    };

    try {
      const content = await this.content(context);
      let errors: string[] = [];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (attempt > 0) {
          const current = await this.storage.readOwned(context);

          if (
            current.state !== claim.expectedState ||
            current.operationId !== claim.operationId ||
            !current.operationDeadline ||
            current.operationDeadline <= new Date()
          ) {
            return status(current);
          }
        }

        const response = await this.completeModel({
          ownerGithubId: context.ownerGithubId,
          request: createGripBoardRequest({ input: content.input, errors }),
          deadline: operation.check.operationDeadline,
        });
        const validated = validateGripBoard({
          content: response,
          diffFiles: content.input.files,
        });

        if (validated.board) {
          content.board = validated.board;
          await this.storage.finishOperation({
            ...claim,
            state: 'READY',
            boardRevision: projectGripBoard(validated.board).revision,
            content: this.encrypt({
              content,
              checkId: context.checkId,
              config: context.config,
            }),
          });

          return this.readStatus(context);
        }

        errors = validated.errors;
      }

      await this.storage.finishOperation({
        ...claim,
        state: 'TECHNICAL_ERROR',
        reason: GRIP_CHECK_REASON.INVALID_BOARD,
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        return this.readStatus(context);
      }

      await this.storage.finishOperation({ ...claim, ...failure(error) });
    }

    return this.readStatus(context);
  }

  async submit(context: GripSubmitCheckParams): Promise<GripCheckStatus> {
    const content = await this.content(context);

    if (!content.board) {
      throw new ConflictException('Grip board is not ready');
    }

    const publicBoard = projectGripBoard(content.board);
    const expected = new Set(
      publicBoard.questions.map((question) => question.id),
    );

    if (
      context.input.boardRevision !== publicBoard.revision ||
      context.input.answers.length !== GRIP_HOSTED_POLICY.QUESTION_COUNT ||
      !context.input.answers.every(
        ({ questionId, answer }) =>
          expected.delete(questionId) &&
          answer.trim().length > 0 &&
          answer.length <= GRIP_HOSTED_POLICY.MAX_ANSWER_LENGTH,
      ) ||
      Buffer.byteLength(JSON.stringify(context.input.answers)) >
        GRIP_HOSTED_POLICY.MAX_ANSWERS_BYTES
    ) {
      throw new BadRequestException('Grip answers do not match the board');
    }

    const operation = await this.storage.claimOperation({
      ...context,
      kind: 'grading',
      requestId: context.input.requestId,
      requestHash: hash(JSON.stringify(context.input)),
      timeoutMs: GRIP_HOSTED_POLICY.GRADING_TIMEOUT_MS,
    });

    if (
      operation.kind !== 'claimed' ||
      !operation.operationId ||
      !operation.check.operationDeadline
    ) {
      return this.readStatus(context);
    }

    const claim = {
      checkId: context.checkId,
      operationId: operation.operationId,
      expectedState: 'GRADING' as const,
    };

    try {
      const response = await this.completeModel({
        ownerGithubId: context.ownerGithubId,
        request: createGripGradeRequest({
          board: content.board,
          input: context.input,
        }),
        deadline: operation.check.operationDeadline,
      });
      let grade;

      try {
        grade = validateGripGrade({
          content: response,
          questionIds: publicBoard.questions.map((question) => question.id),
        });
      } catch {
        await this.storage.finishOperation({
          ...claim,
          state: 'TECHNICAL_ERROR',
          reason: GRIP_CHECK_REASON.INVALID_GRADE,
        });

        return this.readStatus(context);
      }

      content.feedback = grade.feedback;
      await this.storage.finishOperation({
        ...claim,
        state: grade.passed ? GRIP_CHECK_STATE.PASSED : GRIP_CHECK_STATE.FAILED,
        score: grade.score,
        content: this.encrypt({
          content,
          checkId: context.checkId,
          config: context.config,
        }),
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        return this.readStatus(context);
      }

      await this.storage.finishOperation({ ...claim, ...failure(error) });
    }

    return this.readStatus(context);
  }
}
