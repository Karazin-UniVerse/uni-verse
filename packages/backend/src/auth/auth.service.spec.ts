jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { GetCreds } from '../utils/get-creds';
import { LoginDto } from './dto/auth.dto';
import { User, Role } from '@universe/database';

describe('AuthService', () => {
  const mockUserService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    findById: jest.fn(),
  } as jest.Mocked<
    Pick<UserService, 'findByEmail' | 'createUser' | 'updateUser' | 'findById'>
  >;
  const mockGetCreds = {
    getToken: jest.fn(),
    getUserId: jest.fn(),
  } as jest.Mocked<Pick<GetCreds, 'getToken' | 'getUserId'>>;
  const mockJwtService = { signAsync: jest.fn() } as jest.Mocked<
    Pick<JwtService, 'signAsync'>
  >;
  let authService: AuthService;
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    jest.clearAllMocks();
    process.env.AT_SECRET = 'at';
    process.env.RT_SECRET = 'rt';
    authService = new AuthService(
      mockUserService as unknown as UserService,
      mockGetCreds,
      mockJwtService as unknown as JwtService,
    );
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('register success flow', async () => {
    mockUserService.findByEmail.mockResolvedValue(null);
    mockGetCreds.getToken.mockResolvedValue('moodleTok');
    mockGetCreds.getUserId.mockResolvedValue('123');
    const createdUser: User = {
      id: 'u1',
      email: 'a@b.com',
      name: null,
      role: Role.STUDENT,
      password: 'hash',
      token: 'moodleTok',
      moodleId: '123',
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUserService.createUser.mockResolvedValue(createdUser);
    mockJwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    jest.spyOn(authService, 'hashData').mockResolvedValue('rtHash');
    mockUserService.updateUser.mockResolvedValue(createdUser);

    const dto = { email: 'a@b.com', password: 'p' };
    const tokens = await authService.register(dto);
    expect(tokens).toHaveProperty('access_token', 'access-token');
    expect(tokens).toHaveProperty('refresh_token', 'refresh-token');
    expect(mockUserService.createUser).toHaveBeenCalled();
    expect(mockUserService.updateUser).toHaveBeenCalled();
  });

  it('login throws ForbiddenException when Moodle credentials fail', async () => {
    mockGetCreds.getToken.mockRejectedValue(
      new Error('Invalid Moodle credentials'),
    );
    const dto: LoginDto = { email: 'x', password: 'p' };
    await expect(authService.login(dto)).rejects.toThrow();
  });
});
