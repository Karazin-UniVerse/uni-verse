import { GripHostedCleanupService } from '../grip-hosted-cleanup.service';
import type { PrismaClient as PrismaService } from '@universe/database';

describe('hosted Grip retention cleanup', () => {
  it('deletes only bounded expired IDs and reports incomplete work for another batch', async () => {
    const now = new Date('2026-11-06T12:00:00Z');
    const content = {
      findMany: jest.fn().mockResolvedValue([{ checkId: 'expired' }]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(1),
    };
    const empty = () => ({
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      count: jest.fn().mockResolvedValue(0),
    });
    const prisma = {
      gripHostedContent: content,
      gripHostedCheck: empty(),
      gripHostedIntent: empty(),
      gripBrowserSession: empty(),
      gripOAuthTransaction: empty(),
    };
    const service = new GripHostedCleanupService(prisma as unknown as PrismaService);
    const result = await service.cleanupExpiredHostedData({
      now,
      batchSize: 100,
    });

    expect(result).toMatchObject({ contentDeleted: 1, complete: false });
    expect(content.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { purgeAt: { lte: now } }, take: 100 }),
    );
    expect(content.deleteMany).toHaveBeenCalledWith({
      where: { checkId: { in: ['expired'] }, purgeAt: { lte: now } },
    });
    expect(prisma.gripHostedCheck.deleteMany).not.toHaveBeenCalled();
  });

  it('does not report success if a content delete fails', async () => {
    const prisma = {
      gripHostedContent: {
        findMany: jest.fn().mockResolvedValue([{ checkId: 'expired' }]),
        deleteMany: jest.fn().mockRejectedValue(new Error('database unavailable')),
      },
    };
    const service = new GripHostedCleanupService(prisma as unknown as PrismaService);

    await expect(
      service.cleanupExpiredHostedData({ now: new Date(), batchSize: 100 }),
    ).rejects.toThrow('database unavailable');
  });

  it.each([0, -1, 101, 1.5])(
    'rejects unsafe batch size %s before accessing storage',
    async (batchSize) => {
      const service = new GripHostedCleanupService({} as PrismaService);

      await expect(
        service.cleanupExpiredHostedData({ now: new Date(), batchSize }),
      ).rejects.toThrow();
    },
  );
});
