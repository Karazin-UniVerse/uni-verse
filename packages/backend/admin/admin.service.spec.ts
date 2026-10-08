import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@universe/database';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return a list of users', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'test@test.com',
          name: 'Test',
          role: 'STUDENT',
          createdAt: new Date(),
        },
      ];

      jest
        .mocked(prismaService.user.findMany)
        .mockResolvedValue(mockUsers as any);

      const result = await service.getUsers();

      expect(result).toEqual(mockUsers);
      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('setRole', () => {
    it('should throw NotFoundException if user not found', async () => {
      jest.mocked(prismaService.user.findUnique).mockResolvedValue(null);

      await expect(service.setRole('1', Role.MODERATOR)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update and return user role', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test',
        role: 'STUDENT',
      };
      const updatedUser = { ...mockUser, role: Role.MODERATOR };

      jest
        .mocked(prismaService.user.findUnique)
        .mockResolvedValue(mockUser as any);
      jest
        .mocked(prismaService.user.update)
        .mockResolvedValue(updatedUser as any);

      const result = await service.setRole('1', Role.MODERATOR);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: { role: Role.MODERATOR },
        }),
      );
    });
  });
});
