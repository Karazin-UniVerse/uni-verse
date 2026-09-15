import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@universe/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './user-dto';
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
    role: Role.STUDENT,
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
      expect(created.role).toBe(Role.STUDENT);
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
});
