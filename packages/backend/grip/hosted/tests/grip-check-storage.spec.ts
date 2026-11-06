import { ConflictException, NotFoundException } from '@nestjs/common';
import { GripCheckStorageService } from '../grip-check-storage.service';
import type { PrismaService } from '../../../prisma/prisma.service';

function fixture() {
  const check = {
    id: 'internal',
    publicId: 'public-check',
    ownerGithubId: '123',
    state: 'READY',
    bindingDigest: 'binding',
    expiresAt: new Date(Date.now() + 60_000),
    operationId: null,
    operationDeadline: null,
    generationRequestId: 'generation',
    generationRequestHash: 'generation-hash',
    submissionRequestId: null,
    submissionRequestHash: null,
  };
  const transaction = {
    gripHostedCheck: {
      findUnique: jest.fn().mockResolvedValue(check),
      findFirst: jest.fn().mockResolvedValue(check),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    ...transaction,
    $transaction: jest.fn(async (operation) => operation(transaction)),
  };

  return {
    check,
    transaction,
    service: new GripCheckStorageService(prisma as unknown as PrismaService),
  };
}

describe('hosted Grip operation storage', () => {
  it('should claim only a ready, unexpired owner check for grading', async () => {
    const { transaction, service } = fixture();
    const result = await service.claimOperation({
      ownerGithubId: '123',
      checkId: 'public-check',
      kind: 'grading',
      requestId: 'submit-1',
      requestHash: 'hash',
      timeoutMs: 60_000,
    });

    expect(result.kind).toBe('claimed');
    expect(transaction.gripHostedCheck.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          publicId: 'public-check',
          ownerGithubId: '123',
          state: 'READY',
          expiresAt: { gt: expect.any(Date) },
        }),
        data: expect.objectContaining({
          state: 'GRADING',
          operationId: expect.any(String),
          submissionRequestId: 'submit-1',
        }),
      }),
    );
  });

  it('should replay an already claimed identical submission without acquiring another operation', async () => {
    const { check, transaction, service } = fixture();

    Object.assign(check, {
      state: 'GRADING',
      submissionRequestId: 'submit-1',
      submissionRequestHash: 'hash',
    });
    const result = await service.claimOperation({
      ownerGithubId: '123',
      checkId: 'public-check',
      kind: 'grading',
      requestId: 'submit-1',
      requestHash: 'hash',
      timeoutMs: 60_000,
    });

    expect(result.kind).toBe('pending');
    expect(transaction.gripHostedCheck.updateMany).not.toHaveBeenCalled();
  });

  it('should reject a different body reusing an existing request ID', async () => {
    const { check, service } = fixture();

    Object.assign(check, {
      submissionRequestId: 'submit-1',
      submissionRequestHash: 'original',
    });
    await expect(
      service.claimOperation({
        ownerGithubId: '123',
        checkId: 'public-check',
        kind: 'grading',
        requestId: 'submit-1',
        requestHash: 'other',
        timeoutMs: 60_000,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should not reveal another owner check or claim an expired one', async () => {
    const { check, service } = fixture();

    await expect(
      service.claimOperation({
        ownerGithubId: 'other',
        checkId: 'public-check',
        kind: 'grading',
        requestId: 'submit-1',
        requestHash: 'hash',
        timeoutMs: 60_000,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    Object.assign(check, { expiresAt: new Date(0), state: 'EXPIRED' });
    await expect(
      service.claimOperation({
        ownerGithubId: '123',
        checkId: 'public-check',
        kind: 'grading',
        requestId: 'submit-1',
        requestHash: 'hash',
        timeoutMs: 60_000,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should not finalize a result after cancellation or a lost compare-and-set claim', async () => {
    const { transaction, service } = fixture();

    transaction.gripHostedCheck.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.finishOperation({
        checkId: 'public-check',
        operationId: 'old-operation',
        expectedState: 'GRADING',
        state: 'PASSED',
        score: 100,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.gripHostedCheck.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          publicId: 'public-check',
          operationId: 'old-operation',
          state: 'GRADING',
          expiresAt: { gt: expect.any(Date) },
          operationDeadline: { gt: expect.any(Date) },
        }),
      }),
    );
  });

  it('should replay an identical request that wins its claim on another replica', async () => {
    const { check, transaction, service } = fixture();

    transaction.gripHostedCheck.updateMany.mockImplementationOnce(async () => {
      Object.assign(check, {
        state: 'GRADING',
        submissionRequestId: 'submit-1',
        submissionRequestHash: 'hash',
      });

      return { count: 0 };
    });
    await expect(
      service.claimOperation({
        ownerGithubId: '123',
        checkId: 'public-check',
        kind: 'grading',
        requestId: 'submit-1',
        requestHash: 'hash',
        timeoutMs: 60_000,
      }),
    ).resolves.toMatchObject({ kind: 'pending' });
  });
});
