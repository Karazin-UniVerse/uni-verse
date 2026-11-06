import { createHash } from 'node:crypto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GripCheckService } from '../grip-check.service';
import { decryptGripContent, encryptGripContent } from '../grip-content-crypto';
import type { GripCheckStorageService } from '../grip-check-storage.service';
import type { GeminiClientService } from '../../gemini-client.service';
import type { GripQuotaService } from '../../grip-quota.service';
import type { GripHostedConfig } from '../grip-hosted.types';
import { GRIP_PIN_KIND } from '@universe/core/constants/grip-hosted';
import { classifyGeminiFailure } from '../../gemini-failure';
import { GripConfigException } from '../../grip.config';

const config: GripHostedConfig = {
  frontendOrigin: 'https://portal.example',
  callbackUrl: 'https://portal.example/dev-tools/grip/api/auth/callback',
  oauthClientSecret: 'unused',
  encryptionKeys: new Map([['v1', Buffer.alloc(32, 2)]]),
  activeKeyVersion: 'v1',
  cleanupAudience: 'https://backend.example/cleanup',
  cleanupServiceAccountEmail: 'cleanup@example.iam.gserviceaccount.com',
};
const board = {
  summary: 'Validate a request',
  nodes: [
    {
      id: 'caller',
      label: 'Caller',
      role: 'Calls handler',
      kind: 'external',
      trust: 'trusted',
      files: [],
    },
    {
      id: 'handler',
      label: 'Handler',
      role: 'Validates input',
      kind: 'component',
      trust: 'trusted',
      files: ['handler.ts'],
    },
  ],
  edges: [],
  pins: [
    GRIP_PIN_KIND.WHY,
    GRIP_PIN_KIND.FAILURE,
    GRIP_PIN_KIND.VERIFY,
    GRIP_PIN_KIND.HOW,
    GRIP_PIN_KIND.HOW,
  ].map((kind) => ({
    on: 'handler',
    kind,
    question: `Explain ${kind}`,
    rubric: ['Check the input.', 'Preserve the contract.'],
  })),
};
const input = {
  requestId: 'create-intent',
  intentCreatedAt: new Date().toISOString(),
  diff: '+validate input',
  files: ['handler.ts'],
  truncated: false,
  manifest: {
    repository: 'Karazin-UniVerse/uni-verse',
    updates: [],
    policyVersion: 'hosted-v1',
    diffDigest: createHash('sha256').update('+validate input').digest('hex'),
  },
};

function fixture() {
  const check = {
    publicId: 'public-check',
    ownerGithubId: '123',
    bindingDigest: 'binding',
    policyVersion: 'hosted-v1',
    state: 'CREATED',
    expiresAt: new Date(Date.now() + 1_800_000),
    passValidUntil: new Date(Date.now() + 86_400_000),
    operationDeadline: new Date(Date.now() + 120_000),
    operationId: 'op',
    boardRevision: null,
    score: null,
    reason: null,
  };
  let encrypted = encryptGripContent({
    plaintext: Buffer.from(JSON.stringify({ input })),
    checkPublicId: check.publicId,
    payloadVersion: 1,
    keyring: config.encryptionKeys,
    keyVersion: 'v1',
  });
  const storage = {
    readOwned: jest.fn(async () => ({ ...check })),
    claimOperation: jest.fn(async () => {
      check.state = check.boardRevision ? 'GRADING' : 'GENERATING';

      return { kind: 'claimed', check: { ...check }, operationId: 'op' };
    }),
    readContent: jest.fn(async () => encrypted),
    finishOperation: jest.fn(async (result) => {
      Object.assign(check, {
        state: result.state,
        reason: result.reason ?? null,
        score: result.score ?? null,
        boardRevision: result.boardRevision ?? check.boardRevision,
      });

      if (result.content) encrypted = result.content;
    }),
  };
  const model = {
    complete: jest.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(board) } }],
    }),
  };
  const quota = {
    reserveCompletion: jest.fn().mockResolvedValue({ leaseId: 'lease' }),
    releaseCompletion: jest.fn().mockResolvedValue(undefined),
  };
  const service = new GripCheckService(
    storage as unknown as GripCheckStorageService,
    model as unknown as GeminiClientService,
    quota as unknown as GripQuotaService,
  );

  return {
    check,
    storage,
    model,
    quota,
    service,
    content: () =>
      JSON.parse(
        decryptGripContent({
          content: encrypted,
          checkPublicId: check.publicId,
          payloadVersion: 1,
          keyring: config.encryptionKeys,
        }).toString('utf8'),
      ),
  };
}

describe('hosted Grip check orchestration', () => {
  it.each(['PROVIDER_QUOTA', 'CREDENTIAL_UNAVAILABLE'] as const)(
    'should preserve %s when lease release also fails',
    async (reason) => {
      const { service, model, quota, check } = fixture();

      model.complete.mockRejectedValueOnce(
        classifyGeminiFailure(new HttpException('Provider denied', 429), reason),
      );
      quota.releaseCompletion.mockRejectedValueOnce(new Error('Lease deletion unavailable'));
      await service.generate({
        ownerGithubId: '123',
        checkId: 'public-check',
        config,
      });

      expect(check.state).toBe('QUOTA_REJECTED');
      expect(check.reason).toBe(reason);
    },
  );

  it('should persist misconfigured model credentials as denial rather than technical fail-open', async () => {
    const { service, model, check } = fixture();

    model.complete.mockRejectedValueOnce(new GripConfigException('Invalid model configuration'));
    await service.generate({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
    });
    expect(check).toMatchObject({
      state: 'QUOTA_REJECTED',
      reason: 'CREDENTIAL_UNAVAILABLE',
    });
  });
  it('should persist a validated board and never expose its rubric to the browser', async () => {
    const { service, storage, quota, content } = fixture();

    await service.generate({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
    });
    expect(storage.finishOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'READY',
        operationId: 'op',
        boardRevision: expect.any(String),
      }),
    );
    expect(content().board.pins[0].rubric).toEqual(['Check the input.', 'Preserve the contract.']);
    const view = await service.readView({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
    });

    expect(view.board?.questions).toHaveLength(5);
    expect(JSON.stringify(view)).not.toContain('rubric');
    expect(quota.reserveCompletion).toHaveBeenCalledTimes(1);
    expect(quota.releaseCompletion).toHaveBeenCalledWith('lease');
  });

  it('should not expose unexpected nested private data when reading a stored check', async () => {
    const { service, check, storage, content } = fixture();

    await service.generate({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
    });
    const stored = content();

    stored.input.manifest.privateKey = 'SECRET_PRIVATE';
    stored.input.manifest.updates = [
      {
        localRef: 'HEAD',
        remoteRef: 'refs/heads/main',
        localOid: 'a'.repeat(40),
        remoteOid: 'b'.repeat(40),
        secret: 'SECRET_UPDATE',
      },
    ];
    stored.feedback = [
      {
        questionId: 'q1',
        score: 10,
        feedback: 'Safe',
        rubric: 'SECRET_RUBRIC',
      },
    ];
    const encrypted = encryptGripContent({
      plaintext: Buffer.from(JSON.stringify(stored)),
      checkPublicId: check.publicId,
      payloadVersion: 1,
      keyring: config.encryptionKeys,
      keyVersion: 'v1',
    });

    check.state = 'PASSED';
    storage.readContent.mockResolvedValueOnce(encrypted);
    const view = await service.readView({
      ownerGithubId: '123',
      checkId: check.publicId,
      config,
    });

    expect(JSON.stringify(view)).not.toMatch(/SECRET_PRIVATE|SECRET_UPDATE|SECRET_RUBRIC/);
  });

  it('should request at most one repair and persist a technical error after invalid repair', async () => {
    const { model, storage, service, quota } = fixture();

    model.complete.mockResolvedValue({
      choices: [{ message: { content: '{"summary":"not a board"}' } }],
    });
    await service.generate({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
    });

    expect(model.complete).toHaveBeenCalledTimes(2);
    expect(quota.reserveCompletion).toHaveBeenCalledTimes(2);
    expect(storage.finishOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'TECHNICAL_ERROR',
        reason: 'INVALID_BOARD',
      }),
    );
  });

  it('should not dispatch generation again for a replayed or pending operation', async () => {
    const { storage, model, service } = fixture();

    storage.claimOperation.mockResolvedValueOnce({
      kind: 'pending',
      check: {} as never,
      operationId: undefined as never,
    });
    await service.generate({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
    });

    expect(model.complete).not.toHaveBeenCalled();
    expect(storage.finishOperation).not.toHaveBeenCalled();
  });

  it('should not pay for a repair after cancellation revokes the claim', async () => {
    const { storage, model, service, check, quota } = fixture();

    model.complete.mockImplementationOnce(async () => {
      check.state = 'CANCELLED';
      check.operationId = '';

      return { choices: [{ message: { content: '{}' } }] };
    });
    await service.generate({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
    });

    expect(model.complete).toHaveBeenCalledTimes(1);
    expect(quota.reserveCompletion).toHaveBeenCalledTimes(1);
    expect(storage.finishOperation).not.toHaveBeenCalled();
    expect(check.state).toBe('CANCELLED');
  });

  it('should persist quota rejection when the browser-initiated grading reservation fails', async () => {
    const { storage, model, quota, service, check } = fixture();

    await service.generate({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
    });
    quota.reserveCompletion.mockRejectedValueOnce(
      new HttpException('Team quota exceeded', HttpStatus.TOO_MANY_REQUESTS),
    );
    const answers = ['q1', 'q2', 'q3', 'q4', 'q5'].map((questionId) => ({
      questionId,
      answer: 'I checked this behavior.',
    }));

    await service.submit({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
      input: {
        requestId: 'submit-intent',
        boardRevision: check.boardRevision!,
        answers,
      },
    });

    expect(storage.finishOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        expectedState: 'GRADING',
        state: 'QUOTA_REJECTED',
        reason: 'TEAM_QUOTA',
      }),
    );
    expect(
      (
        await service.readStatus({
          ownerGithubId: '123',
          checkId: 'public-check',
        })
      ).state,
    ).toBe('QUOTA_REJECTED');
    expect(model.complete).toHaveBeenCalledTimes(1);
  });

  it('should derive a passing result from five server grades and preserve a single submission intent', async () => {
    const { model, service, check, content } = fixture();

    await service.generate({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
    });
    model.complete.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              grades: ['q1', 'q2', 'q3', 'q4', 'q5'].map((questionId) => ({
                questionId,
                score: 14,
                feedback: 'Explained the contract.',
              })),
            }),
          },
        },
      ],
    });
    await service.submit({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
      input: {
        requestId: 'submission',
        boardRevision: check.boardRevision!,
        answers: ['q1', 'q2', 'q3', 'q4', 'q5'].map((questionId) => ({
          questionId,
          answer: 'Checked the behavior.',
        })),
      },
    });

    expect(check.state).toBe('PASSED');
    expect(check.score).toBe(70);
    expect(content().feedback).toHaveLength(5);
  });

  it('should refuse unknown stored states rather than asserting a public status type', async () => {
    const { service, check } = fixture();

    check.state = 'UNRECOGNIZED';
    await expect(
      service.readStatus({ ownerGithubId: '123', checkId: 'public-check' }),
    ).rejects.toThrow();
  });

  it('should not dispatch a model after quota admission consumes the remaining operation budget', async () => {
    const { service, model, quota, check } = fixture();

    quota.reserveCompletion.mockImplementationOnce(async () => {
      check.operationDeadline.setTime(0);

      return { leaseId: 'lease' };
    });
    await service.generate({
      ownerGithubId: '123',
      checkId: 'public-check',
      config,
    });
    expect(model.complete).not.toHaveBeenCalled();
    expect(quota.releaseCompletion).toHaveBeenCalledWith('lease');
  });
});
