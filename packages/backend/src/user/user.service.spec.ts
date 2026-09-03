import { Test, TestingModule } from '@nestjs/testing';
import { User, Role } from '@universe/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './user-dto';
import { UserService } from './user.service';

describe('UserService', () => {
  const mockUser = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn<Promise<User>, [unknown]>(),
    delete: jest.fn(),
    update: jest.fn(),
  };
  const mockPrisma = { user: mockUser } as unknown as PrismaService;

  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('getUserTokenFromDB returns null when user not found', async () => {
    jest.spyOn(service, 'findByEmail').mockResolvedValue(null);
    await expect(
      service.getUserTokenFromDB('notfound@example.com'),
    ).resolves.toBeNull();
  });

  it('createUser uses prisma.user.create', async () => {
    const dto: CreateUserDto = {
      email: 'a@b.com',
      password: 'p',
      token: 'moodle-token',
      moodleId: '1',
    };
    const created: User = {
      id: '1',
      name: null,
      role: Role.STUDENT,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...dto,
      refreshToken: null,
    };

    mockUser.create.mockResolvedValue(created);
    await expect(service.createUser(dto)).resolves.toEqual(created);
    expect(mockUser.create).toHaveBeenCalledWith({ data: dto });
  });
});
