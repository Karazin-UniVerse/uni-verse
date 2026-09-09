import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
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

  describe('register', () => {
    it('should register user, set refresh cookie, and return access token', async () => {
      const dto: RegisterDto = {
        email: 'test@student.karazin.ua',
        password: 'Password123!',
      };
      const res = createMockResponse();

      authService.register.mockResolvedValue(mockTokens);

      const result = await controller.register(dto, res);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith(
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
      const res = createMockResponse();

      authService.login.mockResolvedValue(mockTokens);

      const result = await controller.login(dto, res);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith(
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
      const res = createMockResponse();

      authService.logout.mockResolvedValue(undefined as any);

      const result = await controller.logout(userId, res);

      expect(authService.logout).toHaveBeenCalledWith(userId);
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens, set new refresh cookie, and return new access token', async () => {
      const userId = 'user-uuid-123';
      const refreshToken = 'current-refresh-token';
      const res = createMockResponse();

      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };

      authService.refreshTokens.mockResolvedValue(newTokens);

      const result = await controller.refreshTokens(userId, refreshToken, res);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        userId,
        refreshToken,
      );
      expect(res.cookie).toHaveBeenCalledWith(
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
});
