import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@universe/database';
import type { PrismaService } from '../../../prisma/prisma.service';
import { GripCheckStorageService } from '../grip-check-storage.service';
import { GripHostedRateLimitService } from '../grip-hosted-rate-limit.service';
import { GripHostedCleanupService } from '../grip-hosted-cleanup.service';
import { GripBrowserAuthService } from '../grip-browser-auth.service';
import type { GithubClientService } from '../../github-client.service';
import type { GripHostedConfig } from '../grip-hosted.types';

describe('hosted Grip (two PostgreSQL clients)', () => {
  const databaseUrl = process.env.GRIP_TEST_DATABASE_URL;
  const ownerGithubId = `hosted-test-${randomUUID()}`;
  let first: PrismaClient;
  let second: PrismaClient;
  let storage: GripCheckStorageService;
  let replica: GripCheckStorageService;

  beforeAll(async () => {
    if (!databaseUrl)
      throw new Error(
        'Set GRIP_TEST_DATABASE_URL to an explicitly confirmed disposable PostgreSQL database.',
      );

    first = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    second = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    await Promise.all([first.$connect(), second.$connect()]);
    storage = new GripCheckStorageService(first as unknown as PrismaService);
    replica = new GripCheckStorageService(second as unknown as PrismaService);
  });

  afterAll(async () => {
    if (first) {
      await first.gripHostedCheck.deleteMany({ where: { ownerGithubId } });
      await first.gripHostedIntent.deleteMany({ where: { ownerGithubId } });
      await first.$disconnect();
    }

    if (second) await second.$disconnect();
  });

  function createInput() {
    return {
      ownerGithubId,
      requestId: randomUUID(),
      requestHash: 'body-one',
      intentCreatedAt: new Date(),
      bindingDigest: randomUUID(),
      policyVersion: 'hosted-v1',
      content: () => ({
        keyVersion: 'test',
        iv: Buffer.alloc(12),
        tag: Buffer.alloc(16),
        ciphertext: Buffer.from('encrypted-test'),
      }),
    };
  }

  it('creates one row for simultaneous identical intents and rejects body substitution', async () => {
    const input = createInput();
    const [left, right] = await Promise.all([
      storage.createOrReplay(input),
      replica.createOrReplay(input),
    ]);

    expect(left.publicId).toBe(right.publicId);
    expect(
      await first.gripHostedCheck.count({ where: { publicId: left.publicId } }),
    ).toBe(1);
    expect(
      await first.gripHostedContent.count({ where: { checkId: left.id } }),
    ).toBe(1);
    await expect(
      replica.createOrReplay({ ...input, requestHash: 'different-body' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reuses a pass only for a new validated intent and never rewrites an earlier denial', async () => {
    const deniedInput = { ...createInput(), bindingDigest: randomUUID() };
    const denied = await storage.createOrReplay(deniedInput);

    await first.gripHostedCheck.update({
      where: { id: denied.id },
      data: { state: 'FAILED', score: 69 },
    });
    const passed = await storage.createOrReplay({
      ...deniedInput,
      requestId: randomUUID(),
    });

    await first.gripHostedCheck.update({
      where: { id: passed.id },
      data: { state: 'PASSED', score: 70 },
    });
    const replayed = await replica.createOrReplay(deniedInput);
    const reuseInput = { ...deniedInput, requestId: randomUUID() };
    const reused = await replica.createOrReplay(reuseInput);

    expect(replayed).toMatchObject({
      publicId: denied.publicId,
      state: 'FAILED',
      score: 69,
    });
    expect(reused).toMatchObject({
      publicId: passed.publicId,
      state: 'PASSED',
      score: 70,
    });
    await first.gripHostedCheck.update({
      where: { id: passed.id },
      data: { passValidUntil: new Date(0) },
    });
    await expect(storage.createOrReplay(reuseInput)).rejects.toBeInstanceOf(
      ConflictException,
    );
    const expiredPassIntent = await storage.createOrReplay({
      ...deniedInput,
      requestId: randomUUID(),
    });

    expect(expiredPassIntent.state).toBe('CREATED');
    await expect(
      replica.createOrReplay({ ...deniedInput, requestHash: 'substituted' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      replica.createOrReplay({
        ...deniedInput,
        requestId: randomUUID(),
        intentCreatedAt: new Date(0),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('admits one paid claim across replicas and replays a persisted terminal grade', async () => {
    const check = await storage.createOrReplay(createInput());

    await first.gripHostedCheck.update({
      where: { id: check.id },
      data: { state: 'READY' },
    });
    const input = {
      ownerGithubId,
      checkId: check.publicId,
      kind: 'grading' as const,
      requestId: randomUUID(),
      requestHash: 'answers',
      timeoutMs: 60_000,
    };
    const claims = await Promise.all([
      storage.claimOperation(input),
      replica.claimOperation(input),
    ]);

    expect(claims.filter((claim) => claim.kind === 'claimed')).toHaveLength(1);
    expect(claims.filter((claim) => claim.kind === 'pending')).toHaveLength(1);
    const winner = claims.find((claim) => claim.kind === 'claimed')!;

    await storage.finishOperation({
      checkId: check.publicId,
      operationId: winner.operationId!,
      expectedState: 'GRADING',
      state: 'PASSED',
      score: 70,
    });
    await expect(replica.claimOperation(input)).resolves.toMatchObject({
      kind: 'replay',
      check: { state: 'PASSED', score: 70 },
    });
    await expect(
      replica.finishOperation({
        checkId: check.publicId,
        operationId: winner.operationId!,
        expectedState: 'GRADING',
        state: 'FAILED',
        score: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('fences cancellation, expiry and abandoned operations against late completion', async () => {
    for (const terminal of ['CANCELLED', 'EXPIRED', 'TECHNICAL_ERROR']) {
      const check = await storage.createOrReplay(createInput());
      const claim = await storage.claimOperation({
        ownerGithubId,
        checkId: check.publicId,
        kind: 'generation',
        requestId: 'generation',
        requestHash: 'generation',
        timeoutMs: 120_000,
      });

      if (terminal === 'CANCELLED')
        await replica.cancelCheck({ ownerGithubId, checkId: check.publicId });
      else
        await first.gripHostedCheck.update({
          where: { id: check.id },
          data:
            terminal === 'EXPIRED'
              ? { expiresAt: new Date(0) }
              : { operationDeadline: new Date(0) },
        });

      await expect(
        replica.readOwned({ ownerGithubId, checkId: check.publicId }),
      ).resolves.toMatchObject({ state: terminal });
      await expect(
        storage.finishOperation({
          checkId: check.publicId,
          operationId: claim.operationId!,
          expectedState: 'GENERATING',
          state: 'READY',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('persists provider quota denial across clients without another claim', async () => {
    const check = await storage.createOrReplay(createInput());
    const input = {
      ownerGithubId,
      checkId: check.publicId,
      kind: 'generation' as const,
      requestId: 'generation',
      requestHash: 'generation',
      timeoutMs: 120_000,
    };
    const claim = await storage.claimOperation(input);

    await storage.finishOperation({
      checkId: check.publicId,
      operationId: claim.operationId!,
      expectedState: 'GENERATING',
      state: 'QUOTA_REJECTED',
      reason: 'PROVIDER_QUOTA',
    });
    await expect(replica.claimOperation(input)).resolves.toMatchObject({
      kind: 'replay',
      check: { state: 'QUOTA_REJECTED', reason: 'PROVIDER_QUOTA' },
    });
    await expect(
      replica.claimOperation({ ...input, requestId: 'new-generation' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('denies foreign owners and content at its purge boundary', async () => {
    const check = await storage.createOrReplay(createInput());

    await expect(
      replica.readOwned({
        ownerGithubId: 'someone-else',
        checkId: check.publicId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await first.gripHostedContent.update({
      where: { checkId: check.id },
      data: { purgeAt: new Date(0) },
    });
    await expect(
      replica.readContent({ ownerGithubId, checkId: check.publicId }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retains a future-clock intent tombstone until the client acceptance window closes', async () => {
    const input = {
      ...createInput(),
      intentCreatedAt: new Date(Date.now() + 299_000),
    };
    const check = await storage.createOrReplay(input);
    const intent = await first.gripHostedIntent.findUniqueOrThrow({
      where: {
        ownerGithubId_requestId: { ownerGithubId, requestId: input.requestId },
      },
    });

    expect(
      intent.replayUntil.getTime() - check.createdAt.getTime(),
    ).toBeGreaterThan(86_698_000);
    await first.gripHostedCheck.delete({ where: { id: check.id } });
    await expect(replica.createOrReplay(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      replica.createOrReplay({
        ...createInput(),
        intentCreatedAt: new Date(Date.now() - 86_400_000),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('enforces the shared read and OAuth limits across two replicas', async () => {
    const limiter = new GripHostedRateLimitService(
      first as unknown as PrismaService,
    );
    const other = new GripHostedRateLimitService(
      second as unknown as PrismaService,
    );

    for (const scope of ['read', 'auth'] as const) {
      const actor = `${ownerGithubId}-${scope}`;
      const limit = scope === 'read' ? 60 : 30;
      const reserve = (instance: GripHostedRateLimitService) =>
        scope === 'read'
          ? instance.reserveRead(actor)
          : instance.reserveAuthStart(actor);

      for (let index = 0; index < limit - 1; index += 1) await reserve(limiter);

      const results = await Promise.allSettled([
        reserve(limiter),
        reserve(other),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
    }
  });

  it('purges expired ciphertext without a key while retaining the skew-window tombstone', async () => {
    const input = createInput();
    const check = await storage.createOrReplay(input);
    const now = new Date();

    await first.gripHostedContent.update({
      where: { checkId: check.id },
      data: { purgeAt: new Date(0), keyVersion: 'unavailable-key' },
    });
    await first.gripHostedCheck.update({
      where: { id: check.id },
      data: { passValidUntil: new Date(0) },
    });
    const cleanup = new GripHostedCleanupService(
      first as unknown as PrismaService,
    );

    await cleanup.cleanupExpiredHostedData({ now, batchSize: 100 });
    expect(
      await second.gripHostedContent.findUnique({
        where: { checkId: check.id },
      }),
    ).toBeNull();
    expect(
      await second.gripHostedCheck.findUnique({ where: { id: check.id } }),
    ).toBeNull();
    expect(
      await second.gripHostedIntent.count({
        where: { ownerGithubId, requestId: input.requestId },
      }),
    ).toBe(1);
    await expect(replica.createOrReplay(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('recovers expired and abandoned operations during cleanup without an owner read', async () => {
    const expired = await storage.createOrReplay(createInput());
    const stale = await storage.createOrReplay(createInput());
    const terminal = await storage.createOrReplay(createInput());

    await first.gripHostedCheck.update({
      where: { id: expired.id },
      data: { state: 'READY', expiresAt: new Date(0) },
    });
    await first.gripHostedCheck.update({
      where: { id: stale.id },
      data: {
        state: 'GRADING',
        operationId: 'abandoned',
        operationDeadline: new Date(0),
      },
    });
    await first.gripHostedCheck.update({
      where: { id: terminal.id },
      data: {
        state: 'QUOTA_REJECTED',
        reason: 'PROVIDER_QUOTA',
        operationDeadline: new Date(0),
      },
    });
    const result = await new GripHostedCleanupService(
      first as unknown as PrismaService,
    ).cleanupExpiredHostedData({ now: new Date(), batchSize: 100 });

    expect(result.complete).toBe(true);
    expect(
      await second.gripHostedCheck.findUnique({ where: { id: expired.id } }),
    ).toMatchObject({ state: 'EXPIRED', operationId: null });
    expect(
      await second.gripHostedCheck.findUnique({ where: { id: stale.id } }),
    ).toMatchObject({
      state: 'TECHNICAL_ERROR',
      reason: 'OPERATION_FAILED',
      operationId: null,
    });
    expect(
      await second.gripHostedCheck.findUnique({ where: { id: terminal.id } }),
    ).toMatchObject({ state: 'QUOTA_REJECTED', reason: 'PROVIDER_QUOTA' });
  });

  it('atomically rotates the previous opaque browser session after reauthentication', async () => {
    const config: GripHostedConfig = {
      frontendOrigin: 'https://portal.example',
      callbackUrl: 'https://portal.example/dev-tools/grip/api/auth/callback',
      oauthClientSecret: 'fixture',
      encryptionKeys: new Map([['v1', Buffer.alloc(32, 3)]]),
      activeKeyVersion: 'v1',
      cleanupAudience: 'https://backend.example',
      cleanupServiceAccountEmail: 'fixture@example.iam.gserviceaccount.com',
    };
    const github = {
      exchangeAuthorizationCode: jest
        .fn()
        .mockResolvedValue('fixture-github-token'),
      identify: jest
        .fn()
        .mockResolvedValue({ githubId: ownerGithubId, login: 'fixture' }),
      assertWriter: jest.fn().mockResolvedValue(undefined),
    };
    const auth = new GripBrowserAuthService(
      first as unknown as PrismaService,
      github as unknown as GithubClientService,
    );
    const returnCheckId = Buffer.from(randomUUID().replace(/-/g, ''), 'hex')
      .toString('base64url')
      .padEnd(43, 'a');
    const login = async (previousSession?: string) => {
      const started = await auth.startBrowserLogin({
        config,
        clientId: 'fixture',
        browserBinding: 'a'.repeat(43),
        returnCheckId,
      });

      return auth.completeBrowserLogin({
        config,
        clientId: 'fixture',
        browserBinding: 'a'.repeat(43),
        state: new URL(started.authorizationUrl).searchParams.get('state')!,
        code: 'fixture',
        previousSession,
      });
    };
    const original = await login();
    const rotated = await login(original.token);

    try {
      await expect(
        auth.authenticateBrowser({ token: original.token, config }),
      ).rejects.toThrow();
      await expect(
        auth.authenticateBrowser({ token: rotated.token, config }),
      ).resolves.toMatchObject({ githubId: ownerGithubId });
    } finally {
      await first.gripBrowserSession.deleteMany({
        where: { githubId: ownerGithubId },
      });
      await first.gripOAuthTransaction.deleteMany({ where: { returnCheckId } });
    }
  });

  it('fences a late grade when cancellation wins on a different replica', async () => {
    const check = await storage.createOrReplay(createInput());

    await first.gripHostedCheck.update({
      where: { id: check.id },
      data: { state: 'READY' },
    });
    const claim = await storage.claimOperation({
      ownerGithubId,
      checkId: check.publicId,
      kind: 'grading',
      requestId: randomUUID(),
      requestHash: 'answers',
      timeoutMs: 60_000,
    });

    await replica.cancelCheck({ ownerGithubId, checkId: check.publicId });
    await expect(
      storage.finishOperation({
        checkId: check.publicId,
        operationId: claim.operationId!,
        expectedState: 'GRADING',
        state: 'PASSED',
        score: 100,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      await first.gripHostedCheck.findUnique({ where: { id: check.id } }),
    ).toMatchObject({ state: 'CANCELLED', score: null });
  });
});
