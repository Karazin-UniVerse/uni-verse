import {
  BadRequestException,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MoodleCredentialsGuard } from './moodle-credentials.guard';

describe('MoodleCredentialsGuard', () => {
  let guard: MoodleCredentialsGuard;
  let mockPrisma: { user: { findUnique: jest.Mock } };

  const createContext = (user?: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    guard = new MoodleCredentialsGuard(mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw UnauthorizedException when user sub is missing', async () => {
    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when user no longer exists in database', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext({ sub: 'deleted-user' })),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'deleted-user' },
      select: { token: true, moodleId: true },
    });
  });

  it('should throw BadRequestException when user has no linked Moodle credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      token: null,
      moodleId: null,
    });

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { token: true, moodleId: true },
    });
  });

  it('should resolve moodleToken and moodleId from database onto request.user', async () => {
    const user: Record<string, unknown> = {
      sub: 'user-1',
      email: 'student@karazin.ua',
      moodleToken: 'spoofed-token',
      moodleId: 'spoofed-id',
    };

    mockPrisma.user.findUnique.mockResolvedValue({
      token: 'db-moodle-token',
      moodleId: '4021',
    });

    const result = await guard.canActivate(createContext(user));

    expect(result).toBe(true);
    expect(user.moodleToken).toBe('db-moodle-token');
    expect(user.moodleId).toBe('4021');
  });
});
