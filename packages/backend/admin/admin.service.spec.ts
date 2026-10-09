import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@universe/database';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new AdminService(prisma);
  });

  describe('getUsers', () => {
    it('returns list of users', async () => {
      const users = [
        {
          id: 'u1',
          email: 'test@example.com',
          name: 'Test',
          role: 'ADMIN' as Role,
          createdAt: new Date(),
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);

      const result = await service.getUsers();

      expect(result).toBe(users);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('setRole', () => {
    it('throws NotFoundException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.setRole('u1', 'ADMIN' as Role)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates and returns user role when user exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1' });
      const updatedUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        role: 'ADMIN' as Role,
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.setRole('u1', 'ADMIN' as Role);

      expect(result).toBe(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { role: 'ADMIN' },
        select: { id: true, email: true, name: true, role: true },
      });
    });
  });
});
