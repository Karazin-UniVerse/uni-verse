import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  GoogleAuthDto,
  LinkMoodleDto,
} from './dto/auth.dto';
import type { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockTokens = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
  };

  const createMockResponse = (): jest.Mocked<Response> => {
    const res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as jest.Mocked<Response>;

    return res;
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshTokens: jest.fn(),
      loginWithGoogle: jest.fn(),
      linkMoodleAccount: jest.fn(),
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
    it('should register user, set refresh cookie, and return access token', async () => {
      const dto: RegisterDto = {
        email: 'test@student.karazin.ua',
        password: 'Password123!',
      };
      const response = createMockResponse();

      authService.register.mockResolvedValue(mockTokens);

      const result = await controller.register(dto, response);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(response.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockTokens.refresh_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
      expect(result).toEqual({ access_token: mockTokens.access_token });
    });
  });

  describe('login', () => {
    it('should login user, set refresh cookie, and return access token', async () => {
      const dto: LoginDto = {
        email: 'student@student.karazin.ua',
        password: 'ValidPassword123',
      };
      const response = createMockResponse();

      authService.login.mockResolvedValue(mockTokens);

      const result = await controller.login(dto, response);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(response.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockTokens.refresh_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        }),
      );
      expect(result).toEqual({ access_token: mockTokens.access_token });
    });
  });

  describe('logout', () => {
    it('should logout user, clear cookie, and return confirmation message', async () => {
      const userId = 'user-uuid-123';
      const response = createMockResponse();

      authService.logout.mockResolvedValue(undefined as any);

      const result = await controller.logout(userId, response);

      expect(authService.logout).toHaveBeenCalledWith(userId);
      expect(response.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens, set new refresh cookie, and return new access token', async () => {
      const userId = 'user-uuid-123';
      const refreshToken = 'current-refresh-token';
      const response = createMockResponse();

      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
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
        'refreshToken',
        newTokens.refresh_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        }),
      );
      expect(result).toEqual({ access_token: newTokens.access_token });
    });
  });

  describe('loginWithGoogle', () => {
    it('should authenticate via Google, set refresh cookie, and return access token and isLinked status', async () => {
      const dto: GoogleAuthDto = {
        credential: 'google-id-token',
      };
      const response = createMockResponse();

      authService.loginWithGoogle.mockResolvedValue({
        access_token: 'google-at',
        refresh_token: 'google-rt',
        isLinked: true,
      });

      const result = await controller.loginWithGoogle(dto, response);

      expect(authService.loginWithGoogle).toHaveBeenCalledWith(dto);
      expect(response.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'google-rt',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        }),
      );
      expect(result).toEqual({
        access_token: 'google-at',
        isLinked: true,
      });
    });
  });

  describe('linkMoodle', () => {
    it('should link Moodle account, set refresh cookie, and return new access token and isLinked=true', async () => {
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
      });

      const result = await controller.linkMoodle(userId, dto, response);

      expect(authService.linkMoodleAccount).toHaveBeenCalledWith(userId, dto);
      expect(response.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-linked-rt',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        }),
      );
      expect(result).toEqual({
        access_token: 'new-linked-at',
        isLinked: true,
      });
    });
  });
});
