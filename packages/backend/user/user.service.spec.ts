jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@universe/database';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, SelfUpdateUserDto, UpdateUserDto } from './user-dto';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  const mockUserPrisma = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockPrismaService = {
    user: mockUserPrisma,
  };

  const mockDate = new Date('2026-01-01T00:00:00.000Z');

  const sampleUser: User = {
    id: 'user-1',
    email: 'student@karazin.ua',
    name: 'Karazin Student',
    password: 'hashed-pwd',
    roles: [Role.OPPORTUNITIES_USER],
    token: 'sample-token',
    moodleId: 'moodle-123',
    refreshToken: null,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should return users from prisma when database is available', async () => {
      mockUserPrisma.findMany.mockResolvedValue([sampleUser]);

      const users = await service.getAllUsers();

      expect(users).toEqual([sampleUser]);
      expect(mockUserPrisma.findMany).toHaveBeenCalledTimes(1);
    });

    it('should fallback to in-memory store when prisma throws an error', async () => {
      mockUserPrisma.findMany.mockRejectedValue(
        new Error('DB Connection Refused'),
      );
      mockUserPrisma.create.mockRejectedValue(new Error('DB Offline'));

      await service.createUser({
        email: 'fallback@karazin.ua',
        name: 'Fallback User',
      });

      const users = await service.getAllUsers();

      expect(users).toHaveLength(1);
      expect(users[0]?.email).toBe('fallback@karazin.ua');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email via prisma', async () => {
      mockUserPrisma.findUnique.mockResolvedValue(sampleUser);

      const user = await service.findByEmail('student@karazin.ua');

      expect(user).toEqual(sampleUser);
      expect(mockUserPrisma.findUnique).toHaveBeenCalledWith({
        where: { email: 'student@karazin.ua' },
      });
    });

    it('should fallback to in-memory search if prisma fails', async () => {
      mockUserPrisma.create.mockRejectedValue(new Error('DB Offline'));
      mockUserPrisma.findUnique.mockRejectedValue(new Error('DB Offline'));

      await service.createUser({
        email: 'offline@karazin.ua',
        name: 'Offline User',
      });

      const user = await service.findByEmail('offline@karazin.ua');

      expect(user).not.toBeNull();
      expect(user?.email).toBe('offline@karazin.ua');

      const notFound = await service.findByEmail('missing@karazin.ua');

      expect(notFound).toBeNull();
    });
  });

  describe('findByMoodleId', () => {
    it('should find user by moodleId via prisma', async () => {
      mockUserPrisma.findFirst.mockResolvedValue(sampleUser);

      const user = await service.findByMoodleId('moodle-123');

      expect(user).toEqual(sampleUser);
      expect(mockUserPrisma.findFirst).toHaveBeenCalledWith({
        where: { moodleId: 'moodle-123' },
      });
    });

    it('should fallback to in-memory search if prisma fails', async () => {
      mockUserPrisma.create.mockRejectedValue(new Error('DB Offline'));
      mockUserPrisma.findFirst.mockRejectedValue(new Error('DB Offline'));

      await service.createUser({
        email: 'moodleuser@karazin.ua',
        token: 'moodle-token-456',
        moodleId: 'moodle-456',
      });

      const user = await service.findByMoodleId('moodle-456');

      expect(user).not.toBeNull();
      expect(user?.email).toBe('moodleuser@karazin.ua');

      const notFound = await service.findByMoodleId('unknown-id');

      expect(notFound).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id via prisma', async () => {
      mockUserPrisma.findUnique.mockResolvedValue(sampleUser);

      const user = await service.findById('user-1');

      expect(user).toEqual(sampleUser);
      expect(mockUserPrisma.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should fallback to in-memory search if prisma fails', async () => {
      mockUserPrisma.create.mockRejectedValue(new Error('DB Offline'));
      mockUserPrisma.findUnique.mockRejectedValue(new Error('DB Offline'));

      const created = await service.createUser({
        email: 'mem@karazin.ua',
      });

      const found = await service.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.email).toBe('mem@karazin.ua');

      const notFound = await service.findById('non-existent-id');

      expect(notFound).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create user via prisma', async () => {
      const dto: CreateUserDto = {
        email: 'new@karazin.ua',
        name: 'New User',
      };

      mockUserPrisma.create.mockResolvedValue({
        ...sampleUser,
        ...dto,
      });

      const created = await service.createUser(dto);

      expect(created.email).toBe(dto.email);
      expect(mockUserPrisma.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          password: dto.password ?? '',
        },
      });
    });

    it('should rethrow error when prisma throws P2002 unique violation', async () => {
      const dto: CreateUserDto = {
        email: 'duplicate@karazin.ua',
      };
      const p2002Error = Object.assign(
        new Error('Unique constraint violation'),
        {
          code: 'P2002',
        },
      );

      mockUserPrisma.create.mockRejectedValue(p2002Error);

      await expect(service.createUser(dto)).rejects.toThrow(
        'Unique constraint violation',
      );
    });

    it('should rethrow error when prisma throws PrismaClientValidationError', async () => {
      const dto: CreateUserDto = {
        email: 'invalid@karazin.ua',
      };
      const validationError = Object.assign(new Error('Validation failed'), {
        name: 'PrismaClientValidationError',
      });

      mockUserPrisma.create.mockRejectedValue(validationError);

      await expect(service.createUser(dto)).rejects.toThrow(
        'Validation failed',
      );
    });

    it('should fallback to in-memory creation on other errors', async () => {
      const dto: CreateUserDto = {
        email: 'offline-create@karazin.ua',
        name: 'Offline Person',
        password: 'secretPassword',
      };

      mockUserPrisma.create.mockRejectedValue(new Error('Connection lost'));

      const created = await service.createUser(dto);

      expect(created.id).toBeDefined();
      expect(created.email).toBe(dto.email);
      expect(created.name).toBe(dto.name);
      expect(created.roles).toEqual([Role.OPPORTUNITIES_USER]);
    });

    it('should reject creating user with unpaired token or moodleId', async () => {
      await expect(
        service.createUser({
          email: 'half@karazin.ua',
          token: 'only-token',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createUser({
          email: 'half@karazin.ua',
          moodleId: 'only-moodle-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should surface database errors in production instead of creating an in-memory user', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const connectionError = new Error('Connection lost');

      process.env.NODE_ENV = 'production';
      mockUserPrisma.create.mockRejectedValue(connectionError);
      mockUserPrisma.findUnique.mockRejectedValue(connectionError);

      try {
        await expect(
          service.createUser({ email: 'ghost@karazin.ua' }),
        ).rejects.toBe(connectionError);
        await expect(service.findById('any-id')).rejects.toBe(connectionError);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  describe('deleteUser', () => {
    it('should delete user via prisma', async () => {
      mockUserPrisma.delete.mockResolvedValue(sampleUser);

      const deleted = await service.deleteUser('user-1');

      expect(deleted).toEqual(sampleUser);
      expect(mockUserPrisma.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should fallback to deleting from in-memory store if prisma fails', async () => {
      mockUserPrisma.create.mockRejectedValue(new Error('DB Offline'));
      mockUserPrisma.delete.mockRejectedValue(new Error('DB Offline'));

      const created = await service.createUser({
        email: 'to-delete@karazin.ua',
      });

      const deleted = await service.deleteUser(created.id);

      expect(deleted.id).toBe(created.id);
      await expect(service.deleteUser('unknown-id')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('updateUser', () => {
    it('should update user via prisma', async () => {
      const updateDto: UpdateUserDto = { name: 'Renamed User' };
      const updatedUser = { ...sampleUser, ...updateDto };

      mockUserPrisma.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('user-1', updateDto);

      expect(result).toEqual(updatedUser);
      expect(mockUserPrisma.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateDto,
      });
    });

    it('should rethrow if prisma returns P2025 (Record not found)', async () => {
      const p2025Error = Object.assign(new Error('Record not found'), {
        code: 'P2025',
      });

      mockUserPrisma.update.mockRejectedValue(p2025Error);

      await expect(
        service.updateUser('non-existent', { name: 'Name' }),
      ).rejects.toThrow('Record not found');
    });

    it('should fallback to updating in-memory store if prisma fails with general error', async () => {
      mockUserPrisma.create.mockRejectedValue(new Error('DB Offline'));
      mockUserPrisma.update.mockRejectedValue(new Error('DB Offline'));

      const created = await service.createUser({
        email: 'update-mem@karazin.ua',
        name: 'Original Name',
      });

      const updated = await service.updateUser(created.id, {
        name: 'Changed Name',
        refreshToken: 'new-rt-hash',
      });

      expect(updated.name).toBe('Changed Name');
      expect(updated.refreshToken).toBe('new-rt-hash');
    });

    it('should rethrow error if user is not found in memory on general error', async () => {
      const offlineError = new Error('Database unreachable');

      mockUserPrisma.update.mockRejectedValue(offlineError);

      await expect(
        service.updateUser('not-in-memory', { name: 'Name' }),
      ).rejects.toThrow('Database unreachable');
    });

    it('should reject updating user with unpaired token or moodleId', async () => {
      await expect(
        service.updateUser('user-1', { token: 'only-token' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateUser('user-1', { moodleId: null }),
      ).rejects.toThrow(BadRequestException);

      mockUserPrisma.update.mockResolvedValue({
        ...sampleUser,
        token: null,
        moodleId: null,
      });

      await expect(
        service.updateUser('user-1', { token: null, moodleId: null }),
      ).resolves.toMatchObject({ token: null, moodleId: null });
    });
  });

  describe('updateOwnProfile', () => {
    it('should forbid updating another user profile', async () => {
      await expect(
        service.updateOwnProfile('', 'user-1', { name: 'Missing Identity' }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateOwnProfile('other-user', 'user-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserPrisma.update).not.toHaveBeenCalled();
    });

    it('should hash password and persist allowed self-update fields', async () => {
      const dto: SelfUpdateUserDto = {
        name: 'Updated Name',
        password: 'newPassword456',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('updated-bcrypt-password');
      mockUserPrisma.update.mockResolvedValue({
        ...sampleUser,
        name: 'Updated Name',
        password: 'updated-bcrypt-password',
      });

      const updated = await service.updateOwnProfile('user-1', 'user-1', dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword456', 12);
      expect(mockUserPrisma.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          name: 'Updated Name',
          password: 'updated-bcrypt-password',
        },
      });
      expect(updated.name).toBe('Updated Name');
    });

    it('should update only password when name is omitted', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('password-only-hash');
      mockUserPrisma.update.mockResolvedValue({
        ...sampleUser,
        password: 'password-only-hash',
      });

      await service.updateOwnProfile('user-1', 'user-1', {
        password: 'newPassword456',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword456', 12);
      expect(mockUserPrisma.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'password-only-hash' },
      });
    });

    it('should ignore disallowed fields when password is omitted', async () => {
      const dto = {
        name: 'Safe Name',
        email: 'spoofed@evil.com',
        moodleId: 'spoofed-id',
        token: 'spoofed-token',
        roles: [Role.ADMIN],
      } as unknown as SelfUpdateUserDto;

      mockUserPrisma.update.mockResolvedValue({
        ...sampleUser,
        name: 'Safe Name',
      });

      await service.updateOwnProfile('user-1', 'user-1', dto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserPrisma.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Safe Name' },
      });
    });
  });

  describe('getUserTokenFromDB', () => {
    it('should return user token when user exists', async () => {
      mockUserPrisma.findUnique.mockResolvedValue(sampleUser);

      const token = await service.getUserTokenFromDB('student@karazin.ua');

      expect(token).toBe('sample-token');
    });

    it('should return null when user does not exist', async () => {
      mockUserPrisma.findUnique.mockResolvedValue(null);

      const token = await service.getUserTokenFromDB('unknown@karazin.ua');

      expect(token).toBeNull();
    });
  });

  describe('replaceRefreshHash', () => {
    it('returns true when Prisma updateMany atomically replaces a matching hash and false otherwise', async () => {
      mockUserPrisma.updateMany.mockResolvedValueOnce({ count: 1 });

      await expect(
        service.replaceRefreshHash('user-1', 'old-hash', 'new-hash'),
      ).resolves.toBe(true);
      expect(mockUserPrisma.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-1', refreshToken: 'old-hash' },
        data: { refreshToken: 'new-hash' },
      });

      mockUserPrisma.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.replaceRefreshHash('user-1', 'stale-hash', 'new-hash'),
      ).resolves.toBe(false);
    });

    it('rethrows Prisma errors when user is absent from in-memory fallback', async () => {
      mockUserPrisma.updateMany.mockRejectedValueOnce(
        new Error('Database unreachable'),
      );

      await expect(
        service.replaceRefreshHash('missing-user', 'old-hash', 'new-hash'),
      ).rejects.toThrow('Database unreachable');
    });

    it('falls back to in-memory store when Prisma fails and enforces expected hash', async () => {
      const offlineError = new Error('Database unreachable');

      mockUserPrisma.create.mockRejectedValueOnce(offlineError);

      const created = await service.createUser({
        email: 'offline-rt@karazin.ua',
      });

      mockUserPrisma.updateMany.mockRejectedValueOnce(offlineError);
      await expect(
        service.replaceRefreshHash(created.id, 'wrong-hash', 'next-hash'),
      ).resolves.toBe(false);

      mockUserPrisma.update.mockRejectedValueOnce(offlineError);
      await service.updateUser(created.id, { refreshToken: 'hash-1' });

      mockUserPrisma.updateMany.mockRejectedValueOnce(offlineError);
      await expect(
        service.replaceRefreshHash(created.id, 'hash-1', 'hash-2'),
      ).resolves.toBe(true);

      mockUserPrisma.findUnique.mockRejectedValueOnce(offlineError);
      await expect(service.findById(created.id)).resolves.toMatchObject({
        refreshToken: 'hash-2',
      });
    });
  });
});
