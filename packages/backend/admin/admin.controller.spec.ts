import { ForbiddenException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Role } from '@universe/database';

describe('AdminController', () => {
  let controller: AdminController;
  let service: jest.Mocked<AdminService>;

  beforeEach(() => {
    service = {
      getUsers: jest.fn(),
      setRole: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    controller = new AdminController(service);
  });

  describe('getUsers', () => {
    it('throws ForbiddenException if caller is not ADMIN', () => {
      expect(() => controller.getUsers('STUDENT')).toThrow(ForbiddenException);
    });

    it('returns users if caller is ADMIN', async () => {
      const users = [
        {
          id: 'u1',
          email: 'test@example.com',
          name: 'Test',
          role: 'ADMIN' as Role,
          createdAt: new Date(),
        },
      ];

      service.getUsers.mockResolvedValue(users);

      const result = await controller.getUsers('ADMIN');

      expect(result).toBe(users);
      expect(service.getUsers).toHaveBeenCalled();
    });
  });

  describe('setRole', () => {
    it('throws ForbiddenException if caller is not ADMIN', () => {
      expect(() =>
        controller.setRole('STUDENT', 'u1', 'ADMIN' as Role),
      ).toThrow(ForbiddenException);
    });

    it('sets user role if caller is ADMIN', async () => {
      const updatedUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        role: 'ADMIN' as Role,
      };

      service.setRole.mockResolvedValue(updatedUser);

      const result = await controller.setRole('ADMIN', 'u1', 'ADMIN' as Role);

      expect(result).toBe(updatedUser);
      expect(service.setRole).toHaveBeenCalledWith('u1', 'ADMIN');
    });
  });
});
