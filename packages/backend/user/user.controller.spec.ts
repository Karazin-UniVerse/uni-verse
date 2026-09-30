jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@universe/database';
import * as bcrypt from 'bcrypt';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './user-dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');

  const mockDbUser: User = {
    id: 'user-uuid-1',
    email: 'test@karazin.ua',
    name: 'Test Student',
    password: 'hashed-password',
    role: Role.STUDENT,
    token: 'moodle-secret-token',
    moodleId: '12345',
    refreshToken: 'hashed-refresh-token',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUserService = {
      getAllUsers: jest.fn(),
      createUser: jest.fn(),
      deleteUser: jest.fn(),
      updateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should return all users mapped to UserResponseDto (stripping password and tokens)', async () => {
      userService.getAllUsers.mockResolvedValue([mockDbUser]);

      const result = await controller.getAllUsers();

      expect(userService.getAllUsers).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        {
          id: mockDbUser.id,
          email: mockDbUser.email,
          name: mockDbUser.name,
          role: mockDbUser.role,
          moodleId: mockDbUser.moodleId,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ]);
      expect(
        (result[0] as unknown as Record<string, unknown>).password,
      ).toBeUndefined();
      expect(
        (result[0] as unknown as Record<string, unknown>).token,
      ).toBeUndefined();
      expect(
        (result[0] as unknown as Record<string, unknown>).refreshToken,
      ).toBeUndefined();
    });
  });

  describe('createUser', () => {
    it('should hash password and create user, returning sanitized response', async () => {
      const dto: CreateUserDto = {
        email: 'new@karazin.ua',
        name: 'New Student',
        password: 'rawPassword123!',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('bcrypt-hashed-password');
      userService.createUser.mockResolvedValue({
        ...mockDbUser,
        email: dto.email,
        name: dto.name ?? null,
        password: 'bcrypt-hashed-password',
      });

      const result = await controller.createUser(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('rawPassword123!', 10);
      expect(userService.createUser).toHaveBeenCalledWith({
        email: 'new@karazin.ua',
        name: 'New Student',
        password: 'bcrypt-hashed-password',
      });
      expect(result.email).toBe('new@karazin.ua');
      expect(
        (result as unknown as Record<string, unknown>).password,
      ).toBeUndefined();
    });

    it('should create user without hashing when password is not provided', async () => {
      const dto: CreateUserDto = {
        email: 'nopass@karazin.ua',
        name: 'No Pass',
      };

      userService.createUser.mockResolvedValue({
        ...mockDbUser,
        email: dto.email,
        name: dto.name ?? null,
        password: '',
      });

      const result = await controller.createUser(dto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userService.createUser).toHaveBeenCalledWith(dto);
      expect(result.email).toBe('nopass@karazin.ua');
    });
  });

  describe('deleteUser', () => {
    it('should call userService.deleteUser and return sanitized response', async () => {
      userService.deleteUser.mockResolvedValue(mockDbUser);

      const result = await controller.deleteUser('user-uuid-1');

      expect(userService.deleteUser).toHaveBeenCalledWith('user-uuid-1');
      expect(result.id).toBe('user-uuid-1');
      expect(
        (result as unknown as Record<string, unknown>).password,
      ).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    it('should hash password when updating password and return sanitized response', async () => {
      const dto: UpdateUserDto = {
        name: 'Updated Name',
        password: 'newPassword456',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('updated-bcrypt-password');
      userService.updateUser.mockResolvedValue({
        ...mockDbUser,
        name: 'Updated Name',
        password: 'updated-bcrypt-password',
      });

      const result = await controller.updateUser('user-uuid-1', dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword456', 10);
      expect(userService.updateUser).toHaveBeenCalledWith('user-uuid-1', {
        name: 'Updated Name',
        password: 'updated-bcrypt-password',
      });
      expect(result.name).toBe('Updated Name');
      expect(
        (result as unknown as Record<string, unknown>).password,
      ).toBeUndefined();
    });

    it('should update user without hashing when password is omitted', async () => {
      const dto: UpdateUserDto = {
        name: 'Updated Name Only',
      };

      userService.updateUser.mockResolvedValue({
        ...mockDbUser,
        name: 'Updated Name Only',
      });

      const result = await controller.updateUser('user-uuid-1', dto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userService.updateUser).toHaveBeenCalledWith('user-uuid-1', dto);
      expect(result.name).toBe('Updated Name Only');
    });
  });
});
