import { randomBytes, randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GripHostedCheck } from '@universe/database';
import { PrismaService } from '../../prisma/prisma.service';
import { GRIP_HOSTED_POLICY } from '@universe/core/constants/grip-hosted';
import type {
  GripClaimOperationParams,
  GripEncryptedContent,
  GripFinishOperationParams,
} from './grip-hosted.types';

const NONTERMINAL = ['CREATED', 'GENERATING', 'READY', 'GRADING'];

@Injectable()
export class GripCheckStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async readOwned({
    ownerGithubId,
    checkId,
  }: {
    ownerGithubId: string;
    checkId: string;
  }): Promise<GripHostedCheck> {
    const check = await this.prisma.gripHostedCheck.findUnique({
      where: { publicId: checkId },
    });

    if (!check || check.ownerGithubId !== ownerGithubId) {
      throw new NotFoundException('Grip check not found');
    }

    const now = new Date();
    const expired = check.expiresAt <= now && NONTERMINAL.includes(check.state);
    const stale =
      check.operationDeadline !== null &&
      check.operationDeadline <= now &&
      ['GENERATING', 'GRADING'].includes(check.state);

    if (expired || stale) {
      await this.prisma.gripHostedCheck.updateMany({
        where: {
          id: check.id,
          state: check.state,
          operationId: check.operationId,
        },
        data: {
          state: expired ? 'EXPIRED' : 'TECHNICAL_ERROR',
          reason: expired ? null : 'OPERATION_FAILED',
          operationId: null,
          operationDeadline: null,
        },
      });

      return this.readOwned({ ownerGithubId, checkId });
    }

    return check;
  }

  async claimOperation({
    ownerGithubId,
    checkId,
    kind,
    requestId,
    requestHash,
    timeoutMs,
  }: GripClaimOperationParams): Promise<{
    kind: 'claimed' | 'pending' | 'replay';
    check: GripHostedCheck;
    operationId?: string;
  }> {
    const check = await this.readOwned({ ownerGithubId, checkId });
    const storedId =
      kind === 'generation'
        ? check.generationRequestId
        : check.submissionRequestId;
    const storedHash =
      kind === 'generation'
        ? check.generationRequestHash
        : check.submissionRequestHash;
    const runningState = kind === 'generation' ? 'GENERATING' : 'GRADING';
    const expectedState = kind === 'generation' ? 'CREATED' : 'READY';

    if (storedId === requestId) {
      if (storedHash !== requestHash) {
        throw new ConflictException(
          'Grip request ID reused with different content',
        );
      }

      return {
        kind: check.state === runningState ? 'pending' : 'replay',
        check,
      };
    }

    if (check.state !== expectedState || check.expiresAt <= new Date()) {
      throw new ConflictException('Grip check is not ready for this operation');
    }

    const operationId = randomUUID();
    const operationDeadline = new Date(
      Math.min(check.expiresAt.getTime(), Date.now() + timeoutMs),
    );
    const updated = await this.prisma.gripHostedCheck.updateMany({
      where: {
        publicId: checkId,
        ownerGithubId,
        state: expectedState,
        expiresAt: { gt: new Date() },
      },
      data: {
        state: runningState,
        operationId,
        operationDeadline,
        ...(kind === 'generation'
          ? {
              generationRequestId: requestId,
              generationRequestHash: requestHash,
            }
          : {
              submissionRequestId: requestId,
              submissionRequestHash: requestHash,
            }),
      },
    });

    if (updated.count !== 1) {
      const winner = await this.readOwned({ ownerGithubId, checkId });
      const winnerId =
        kind === 'generation'
          ? winner.generationRequestId
          : winner.submissionRequestId;
      const winnerHash =
        kind === 'generation'
          ? winner.generationRequestHash
          : winner.submissionRequestHash;

      if (winnerId === requestId && winnerHash === requestHash) {
        return {
          kind: winner.state === runningState ? 'pending' : 'replay',
          check: winner,
        };
      }

      throw new ConflictException('Grip operation was already claimed');
    }

    return {
      kind: 'claimed',
      check: { ...check, state: runningState, operationId, operationDeadline },
      operationId,
    };
  }

  async finishOperation({
    checkId,
    operationId,
    expectedState,
    state,
    score,
    reason,
    boardRevision,
    content,
  }: GripFinishOperationParams): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.gripHostedCheck.updateMany({
        where: {
          publicId: checkId,
          operationId,
          state: expectedState,
          expiresAt: { gt: new Date() },
          operationDeadline: { gt: new Date() },
        },
        data: {
          state,
          score,
          reason,
          boardRevision,
          operationId: null,
          operationDeadline: null,
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException('Grip operation no longer owns this check');
      }

      if (content) {
        const check = await transaction.gripHostedCheck.findUniqueOrThrow({
          where: { publicId: checkId },
          select: { id: true },
        });

        await transaction.gripHostedContent.update({
          where: { checkId: check.id },
          data: {
            keyVersion: content.keyVersion,
            iv: Uint8Array.from(content.iv),
            tag: Uint8Array.from(content.tag),
            ciphertext: Uint8Array.from(content.ciphertext),
          },
        });
      }
    });
  }

  async cancelCheck({
    ownerGithubId,
    checkId,
  }: {
    ownerGithubId: string;
    checkId: string;
  }): Promise<void> {
    await this.readOwned({ ownerGithubId, checkId });
    await this.prisma.gripHostedCheck.updateMany({
      where: { publicId: checkId, ownerGithubId, state: { in: NONTERMINAL } },
      data: { state: 'CANCELLED', operationId: null, operationDeadline: null },
    });
  }

  async readContent({
    ownerGithubId,
    checkId,
  }: {
    ownerGithubId: string;
    checkId: string;
  }): Promise<GripEncryptedContent> {
    const check = await this.readOwned({ ownerGithubId, checkId });
    const content = await this.prisma.gripHostedContent.findUnique({
      where: { checkId: check.id },
    });

    if (!content || content.purgeAt <= new Date()) {
      throw new NotFoundException('Grip check content has expired');
    }

    return {
      keyVersion: content.keyVersion,
      iv: Buffer.from(content.iv),
      tag: Buffer.from(content.tag),
      ciphertext: Buffer.from(content.ciphertext),
    };
  }

  async createOrReplay({
    ownerGithubId,
    requestId,
    requestHash,
    intentCreatedAt,
    bindingDigest,
    policyVersion,
    content,
  }: {
    ownerGithubId: string;
    requestId: string;
    requestHash: string;
    intentCreatedAt: Date;
    bindingDigest: string;
    policyVersion: string;
    content: (publicId: string) => GripEncryptedContent;
  }): Promise<GripHostedCheck> {
    const now = new Date();
    const age = now.getTime() - intentCreatedAt.getTime();

    if (
      !Number.isFinite(age) ||
      age >= GRIP_HOSTED_POLICY.PASS_TTL_MS ||
      age < -GRIP_HOSTED_POLICY.CLIENT_CLOCK_SKEW_MS
    ) {
      throw new ConflictException(
        'Grip create intent has expired or invalid time',
      );
    }

    const publicId = randomBytes(32).toString('base64url');

    return this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.gripHostedIntent.createMany({
        data: [
          {
            ownerGithubId,
            requestId,
            requestHash,
            checkPublicId: publicId,
            replayUntil: new Date(
              Math.max(now.getTime(), intentCreatedAt.getTime()) +
                GRIP_HOSTED_POLICY.PASS_TTL_MS,
            ),
          },
        ],
        skipDuplicates: true,
      });

      if (claimed.count === 0) {
        const intent = await transaction.gripHostedIntent.findUniqueOrThrow({
          where: { ownerGithubId_requestId: { ownerGithubId, requestId } },
        });

        if (intent.requestHash !== requestHash) {
          throw new ConflictException(
            'Grip request ID reused with different content',
          );
        }

        const existing = await transaction.gripHostedCheck.findUnique({
          where: { publicId: intent.checkPublicId },
        });

        if (!existing) {
          throw new ConflictException('Grip check is no longer available');
        }

        if (
          existing.state === 'PASSED' &&
          existing.passValidUntil <= new Date()
        ) {
          throw new ConflictException('Grip pass has expired');
        }

        return existing;
      }

      const remembered = await transaction.gripHostedCheck.findFirst({
        where: {
          ownerGithubId,
          bindingDigest,
          policyVersion,
          state: 'PASSED',
          passValidUntil: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (remembered) {
        await transaction.gripHostedIntent.update({
          where: { ownerGithubId_requestId: { ownerGithubId, requestId } },
          data: { checkPublicId: remembered.publicId },
        });

        return remembered;
      }

      const encrypted = content(publicId);

      return transaction.gripHostedCheck.create({
        data: {
          publicId,
          ownerGithubId,
          bindingDigest,
          policyVersion,
          createdAt: now,
          expiresAt: new Date(
            now.getTime() + GRIP_HOSTED_POLICY.DEFENSE_TTL_MS,
          ),
          passValidUntil: new Date(
            now.getTime() + GRIP_HOSTED_POLICY.PASS_TTL_MS,
          ),
          content: {
            create: {
              keyVersion: encrypted.keyVersion,
              iv: Uint8Array.from(encrypted.iv),
              tag: Uint8Array.from(encrypted.tag),
              ciphertext: Uint8Array.from(encrypted.ciphertext),
              purgeAt: new Date(
                now.getTime() +
                  GRIP_HOSTED_POLICY.PASS_TTL_MS -
                  GRIP_HOSTED_POLICY.DEFENSE_TTL_MS,
              ),
            },
          },
        },
      });
    });
  }
}
