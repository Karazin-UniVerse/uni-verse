import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { GripStoredSession } from './grip.types';

@Injectable()
export class GripStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession({
    tokenHash,
    githubId,
    githubLogin,
    expiresAt,
  }: {
    tokenHash: string;
    githubId: string;
    githubLogin: string;
    expiresAt: Date;
  }): Promise<GripStoredSession> {
    const session = await this.prisma.gripSession.create({
      data: {
        tokenHash,
        githubId,
        githubLogin,
        expiresAt,
      },
    });

    return session;
  }

  async findSession(tokenHash: string): Promise<GripStoredSession | null> {
    const session = await this.prisma.gripSession.findUnique({
      where: { tokenHash },
    });

    if (!session) {
      return null;
    }

    if (session.revokedAt !== null || session.expiresAt <= new Date()) {
      return null;
    }

    return session;
  }

  async revokeSession(id: string): Promise<void> {
    await this.prisma.gripSession.updateMany({
      where: {
        id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
