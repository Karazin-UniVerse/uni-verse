import { GripStorageService } from '../grip-storage.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('GripStorageService', () => {
  let service: GripStorageService;
  let mockPrisma: {
    gripSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      gripSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    service = new GripStorageService(mockPrisma as unknown as PrismaService);
  });

  it('creates and returns a stored session', async () => {
    const expiresAt = new Date(Date.now() + 30 * 86400 * 1000);
    const stored = {
      id: 'session-uuid-1',
      tokenHash: 'hash-123',
      githubId: '123456',
      githubLogin: 'octocat',
      createdAt: new Date(),
      expiresAt,
      revokedAt: null,
    };

    mockPrisma.gripSession.create.mockResolvedValue(stored);

    const result = await service.createSession({
      tokenHash: 'hash-123',
      githubId: '123456',
      githubLogin: 'octocat',
      expiresAt,
    });

    expect(result).toEqual(stored);
    expect(mockPrisma.gripSession.create).toHaveBeenCalledWith({
      data: {
        tokenHash: 'hash-123',
        githubId: '123456',
        githubLogin: 'octocat',
        expiresAt,
      },
    });
  });

  it('returns session for valid active token', async () => {
    const active = {
      id: 'session-uuid-2',
      tokenHash: 'active-hash',
      githubId: '123456',
      githubLogin: 'octocat',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 100_000),
      revokedAt: null,
    };

    mockPrisma.gripSession.findUnique.mockResolvedValue(active);

    const result = await service.findSession('active-hash');

    expect(result).toEqual(active);
  });

  it('returns null for non-existent, expired or revoked sessions', async () => {
    mockPrisma.gripSession.findUnique.mockResolvedValue(null);
    expect(await service.findSession('missing')).toBeNull();

    const expired = {
      id: 'session-uuid-3',
      tokenHash: 'expired-hash',
      githubId: '123456',
      githubLogin: 'octocat',
      createdAt: new Date(Date.now() - 200_000),
      expiresAt: new Date(Date.now() - 100_000),
      revokedAt: null,
    };

    mockPrisma.gripSession.findUnique.mockResolvedValue(expired);
    expect(await service.findSession('expired-hash')).toBeNull();

    const revoked = {
      id: 'session-uuid-4',
      tokenHash: 'revoked-hash',
      githubId: '123456',
      githubLogin: 'octocat',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 100_000),
      revokedAt: new Date(),
    };

    mockPrisma.gripSession.findUnique.mockResolvedValue(revoked);
    expect(await service.findSession('revoked-hash')).toBeNull();
  });

  it('revokes session idempotently', async () => {
    mockPrisma.gripSession.updateMany.mockResolvedValue({ count: 1 });

    await service.revokeSession('session-uuid-1');

    expect(mockPrisma.gripSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-uuid-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});
