import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '@universe/core/types/auth';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthDto, LinkMoodleDto, LoginDto, RegisterDto } from './dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockSessionUser: SessionUser = {
    id: 'user-uuid-123',
    email: 'student@student.karazin.ua',
    name: 'Test Student',
    roles: ['MOODLE_STUDENT'],
    isLinked: true,
  };

  const mockAuthResult = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: mockSessionUser,
  };

  const createMockResponse = (): jest.Mocked<Response> => {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as jest.Mocked<Response>;
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshTokens: jest.fn(),
      loginWithGoogle: jest.fn(),
      linkMoodleAccount: jest.fn(),
      unlinkMoodleAccount: jest.fn(),
      getSessionUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should be instantiable directly with constructor', () => {
    const directController = new AuthController(authService);

    expect(directController).toBeDefined();
  });

  describe('register', () => {
    it('should register user, set httpOnly auth cookies, and return user metadata without raw tokens', async () => {
      const dto: RegisterDto = {
        email: 'test@student.karazin.ua',
        password: 'Password123!',
      };
      const response = createMockResponse();

      authService.register.mockResolvedValue(mockAuthResult);

      const result = await controller.register(dto, response);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(response.cookie).toHaveBeenCalledWith(
        'accessToken',
        mockAuthResult.access_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000,
        }),
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockAuthResult.refresh_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
      expect(result).toEqual({ user: mockSessionUser });
    });
  });

  describe('login', () => {
    it('should login user, set httpOnly auth cookies, and return user metadata', async () => {
      const dto: LoginDto = {
        email: 'student@student.karazin.ua',
        password: 'ValidPassword123',
      };
      const response = createMockResponse();

      authService.login.mockResolvedValue(mockAuthResult);

      const result = await controller.login(dto, response);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(response.cookie).toHaveBeenCalledWith(
        'accessToken',
        mockAuthResult.access_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockAuthResult.refresh_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(result).toEqual({ user: mockSessionUser });
    });
  });

  describe('me', () => {
    it('should return current session user metadata', async () => {
      authService.getSessionUser.mockResolvedValue(mockSessionUser);

      const result = await controller.me(mockSessionUser.id);

      expect(authService.getSessionUser).toHaveBeenCalledWith(
        mockSessionUser.id,
      );
      expect(result).toEqual(mockSessionUser);
    });
  });

  describe('logout', () => {
    it('should logout user, clear both httpOnly cookies, and return confirmation message', async () => {
      const userId = 'user-uuid-123';
      const response = createMockResponse();

      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(userId, response);

      expect(authService.logout).toHaveBeenCalledWith(userId);
      expect(response.clearCookie).toHaveBeenCalledWith(
        'accessToken',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(response.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens, rotate both httpOnly cookies, and return user metadata', async () => {
      const userId = 'user-uuid-123';
      const refreshToken = 'current-refresh-token';
      const response = createMockResponse();

      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: mockSessionUser,
      };

      authService.refreshTokens.mockResolvedValue(newTokens);

      const result = await controller.refreshTokens(
        userId,
        refreshToken,
        response,
      );

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        userId,
        refreshToken,
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'accessToken',
        newTokens.access_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'refreshToken',
        newTokens.refresh_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(result).toEqual({ user: mockSessionUser });
    });
  });

  describe('loginWithGoogle', () => {
    it('should authenticate via Google, set httpOnly cookies, and return user and isLinked status', async () => {
      const dto: GoogleAuthDto = {
        idToken: 'google-id-token',
      };
      const response = createMockResponse();

      authService.loginWithGoogle.mockResolvedValue({
        access_token: 'google-at',
        refresh_token: 'google-rt',
        isLinked: true,
        user: mockSessionUser,
      });

      const result = await controller.loginWithGoogle(dto, response);

      expect(authService.loginWithGoogle).toHaveBeenCalledWith(dto);
      expect(response.cookie).toHaveBeenCalledWith(
        'accessToken',
        'google-at',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'google-rt',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(result).toEqual({
        isLinked: true,
        user: mockSessionUser,
      });
    });

    it('should propagate ForbiddenException when user domain is not allowed', async () => {
      const dto: GoogleAuthDto = {
        idToken: 'unauthorized-domain-token',
      };
      const response = createMockResponse();

      authService.loginWithGoogle.mockRejectedValue(
        new ForbiddenException(
          'Доступ дозволено лише для облікових записів @student.karazin.ua та @karazin.ua',
        ),
      );

      await expect(controller.loginWithGoogle(dto, response)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('linkMoodle', () => {
    it('should link Moodle account, rotate cookies, and return user and isLinked=true', async () => {
      const userId = 'user-uuid-123';
      const dto: LinkMoodleDto = {
        username: 'moodle.user',
        password: 'Password123!',
      };
      const response = createMockResponse();

      authService.linkMoodleAccount.mockResolvedValue({
        access_token: 'new-linked-at',
        refresh_token: 'new-linked-rt',
        isLinked: true,
        user: mockSessionUser,
      });

      const result = await controller.linkMoodle(userId, dto, response);

      expect(authService.linkMoodleAccount).toHaveBeenCalledWith(userId, dto);
      expect(response.cookie).toHaveBeenCalledWith(
        'accessToken',
        'new-linked-at',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(result).toEqual({
        isLinked: true,
        user: mockSessionUser,
      });
    });
  });

  describe('unlinkMoodle', () => {
    it('should unlink Moodle account, rotate cookies, and return user with isLinked=false', async () => {
      const userId = 'user-uuid-123';
      const response = createMockResponse();
      const unlinkedUser = { ...mockSessionUser, isLinked: false };

      authService.unlinkMoodleAccount.mockResolvedValue({
        access_token: 'new-unlinked-at',
        refresh_token: 'new-unlinked-rt',
        isLinked: false,
        user: unlinkedUser,
      });

      const result = await controller.unlinkMoodle(userId, response);

      expect(authService.unlinkMoodleAccount).toHaveBeenCalledWith(userId);
      expect(response.cookie).toHaveBeenCalledWith(
        'accessToken',
        'new-unlinked-at',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(result).toEqual({
        isLinked: false,
        user: unlinkedUser,
      });
    });
  });

  describe('cookie environment branch', () => {
    it('should set secure=true and sameSite=none on both cookies when NODE_ENV is production', async () => {
      const originalEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = 'production';

      try {
        const dto: LoginDto = {
          email: 'prod@student.karazin.ua',
          password: 'Password123!',
        };
        const response = createMockResponse();

        authService.login.mockResolvedValue(mockAuthResult);

        await controller.login(dto, response);

        expect(response.cookie).toHaveBeenCalledWith(
          'accessToken',
          mockAuthResult.access_token,
          expect.objectContaining({
            secure: true,
            sameSite: 'none',
          }),
        );
        expect(response.cookie).toHaveBeenCalledWith(
          'refreshToken',
          mockAuthResult.refresh_token,
          expect.objectContaining({
            secure: true,
            sameSite: 'none',
          }),
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should clear both cookies with secure=true and sameSite=none when NODE_ENV is production', async () => {
      const originalEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = 'production';

      try {
        const response = createMockResponse();

        authService.logout.mockResolvedValue(undefined);

        await controller.logout('user-123', response);

        expect(response.clearCookie).toHaveBeenCalledWith(
          'accessToken',
          expect.objectContaining({
            secure: true,
            sameSite: 'none',
          }),
        );
        expect(response.clearCookie).toHaveBeenCalledWith(
          'refreshToken',
          expect.objectContaining({
            secure: true,
            sameSite: 'none',
          }),
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
