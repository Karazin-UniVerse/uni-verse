jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { GetCreds } from '../utils/get-creds';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { User, Role } from '@universe/database';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  const mockUserService = {
    findByEmail: jest.fn(),
    findByMoodleId: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  const mockGetCreds = {
    getToken: jest.fn(),
    getUserId: jest.fn(),
    getBaseUrl: jest.fn(),
  } as unknown as jest.Mocked<GetCreds>;

  const mockJwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  let authService: AuthService;
  const OLD_ENV = process.env;

  const sampleUser: User = {
    id: 'user-uuid-1',
    email: 'student@student.karazin.ua',
    name: 'Test Student',
    role: Role.STUDENT,
    password: 'hashed-password',
    token: 'moodle-token-123',
    moodleId: '5001',
    refreshToken: 'hashed-rt-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    jest.clearAllMocks();
    process.env.AT_SECRET = 'valid-production-at-secret';
    process.env.RT_SECRET = 'valid-production-rt-secret';

    authService = new AuthService(
      mockUserService,
      mockGetCreds,
      mockJwtService,
    );
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'student@student.karazin.ua',
      password: 'StrongPassword123!',
    };

    it('should successfully register a new user with moodle tokens', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockGetCreds.getToken.mockResolvedValue('moodle-tok');
      mockGetCreds.getUserId.mockResolvedValue('5001');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-val');
      mockUserService.createUser.mockResolvedValue(sampleUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockUserService.updateUser.mockResolvedValue(sampleUser);

      const result = await authService.register(registerDto);

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUserService.createUser).toHaveBeenCalled();
      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        sampleUser.id,
        expect.objectContaining({ refreshToken: 'hashed-val' }),
      );
    });

    it('should throw BadRequestException if user already exists', async () => {
      mockUserService.findByEmail.mockResolvedValue(sampleUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockGetCreds.getToken).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Moodle authentication fails during registration', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockGetCreds.getToken.mockRejectedValue(
        new Error('Invalid credentials on Moodle'),
      );

      await expect(authService.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle Prisma P2002 unique constraint collision during user creation', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockGetCreds.getToken.mockResolvedValue('tok');
      mockGetCreds.getUserId.mockResolvedValue('100');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockUserService.createUser.mockRejectedValue({ code: 'P2002' });

      await expect(authService.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rethrow unexpected errors during user creation', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockGetCreds.getToken.mockResolvedValue('tok');
      mockGetCreds.getUserId.mockResolvedValue('100');
      mockUserService.createUser.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(authService.register(registerDto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'student@student.karazin.ua',
      password: 'StrongPassword123!',
    };

    it('should throw ForbiddenException if Moodle credentials fail', async () => {
      mockGetCreds.getToken.mockRejectedValue(new Error('Moodle login error'));

      await expect(authService.login(loginDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should login an existing user and update moodle credentials', async () => {
      mockGetCreds.getToken.mockResolvedValue('fresh-moodle-token');
      mockGetCreds.getUserId.mockResolvedValue('5001');
      mockUserService.findByMoodleId.mockResolvedValue(sampleUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('at-123')
        .mockResolvedValueOnce('rt-123');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-rt');
      mockUserService.updateUser.mockResolvedValue(sampleUser);

      const tokens = await authService.login(loginDto);

      expect(tokens).toEqual({
        access_token: 'at-123',
        refresh_token: 'rt-123',
      });
      expect(mockUserService.updateUser).toHaveBeenCalledWith(sampleUser.id, {
        token: 'fresh-moodle-token',
        moodleId: '5001',
      });
    });

    it('should create a new local user on first successful Moodle login if not existing in DB', async () => {
      const usernameLoginDto: LoginDto = {
        email: 'melnyk.bogdan',
        password: 'Password123',
      };

      mockGetCreds.getToken.mockResolvedValue('moodle-token-new');
      mockGetCreds.getUserId.mockResolvedValue('6002');
      mockUserService.findByMoodleId.mockResolvedValue(null);
      mockUserService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-user-pw-hash');
      mockUserService.createUser.mockResolvedValue({
        ...sampleUser,
        id: 'new-user-uuid',
        email: 'melnyk.bogdan@student.karazin.ua',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-at')
        .mockResolvedValueOnce('new-rt');

      const tokens = await authService.login(usernameLoginDto);

      expect(tokens).toHaveProperty('access_token', 'new-at');
      expect(mockUserService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'melnyk.bogdan@student.karazin.ua',
          token: 'moodle-token-new',
          moodleId: '6002',
        }),
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token in database for the user', async () => {
      mockUserService.updateUser.mockResolvedValue(sampleUser);

      await authService.logout('user-uuid-1');

      expect(mockUserService.updateUser).toHaveBeenCalledWith('user-uuid-1', {
        refreshToken: null,
      });
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens when valid refresh token matches stored hash', async () => {
      mockUserService.findById.mockResolvedValue(sampleUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('fresh-at')
        .mockResolvedValueOnce('fresh-rt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-rt-hash');
      mockUserService.updateUser.mockResolvedValue(sampleUser);

      const result = await authService.refreshTokens('user-uuid-1', 'valid-rt');

      expect(result).toEqual({
        access_token: 'fresh-at',
        refresh_token: 'fresh-rt',
      });
      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ refreshToken: 'new-rt-hash' }),
      );
    });

    it('should throw ForbiddenException if user not found or has no refresh token', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(
        authService.refreshTokens('non-existent', 'rt'),
      ).rejects.toThrow(ForbiddenException);

      mockUserService.findById.mockResolvedValue({
        ...sampleUser,
        refreshToken: null,
      });

      await expect(
        authService.refreshTokens(sampleUser.id, 'rt'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if refresh token does not match hash', async () => {
      mockUserService.findById.mockResolvedValue(sampleUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.refreshTokens(sampleUser.id, 'mismatched-rt'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTokens secrets verification', () => {
    it('should throw Error if JWT secrets are placeholders or missing', async () => {
      // AT_SECRET placeholder
      process.env.AT_SECRET = 'your-access-token-secret-key';
      process.env.RT_SECRET = 'valid-production-rt-secret';

      await expect(
        authService.getTokens('u1', 'test@example.com'),
      ).rejects.toThrow('JWT secrets are not configured securely');

      // AT_SECRET missing
      delete process.env.AT_SECRET;

      await expect(
        authService.getTokens('u1', 'test@example.com'),
      ).rejects.toThrow('JWT secrets are not configured securely');

      // RT_SECRET placeholder
      process.env.AT_SECRET = 'valid-production-at-secret';
      process.env.RT_SECRET = 'your-refresh-token-secret-key';

      await expect(
        authService.getTokens('u1', 'test@example.com'),
      ).rejects.toThrow('JWT secrets are not configured securely');

      // RT_SECRET missing
      delete process.env.RT_SECRET;

      await expect(
        authService.getTokens('u1', 'test@example.com'),
      ).rejects.toThrow('JWT secrets are not configured securely');
    });
  });
});
