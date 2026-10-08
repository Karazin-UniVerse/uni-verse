import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@universe/database';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            getUsers: jest.fn(),
            setRole: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should throw ForbiddenException if role is not ADMIN', () => {
      expect(() => controller.getUsers(Role.STUDENT)).toThrow(
        ForbiddenException,
      );
    });

    it('should return users for ADMIN', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'test@test.com',
          name: 'Test',
          role: Role.STUDENT,
          createdAt: new Date(),
        },
      ];

      jest.mocked(service.getUsers).mockResolvedValue(mockUsers);

      const result = await controller.getUsers(Role.ADMIN);

      expect(result).toEqual(mockUsers);
      expect(service.getUsers).toHaveBeenCalled();
    });
  });

  describe('setRole', () => {
    it('should throw ForbiddenException if role is not ADMIN', () => {
      expect(() =>
        controller.setRole(Role.STUDENT, '1', Role.OPPORTUNITIES_MODERATOR),
      ).toThrow(ForbiddenException);
    });

    it('should call setRole for ADMIN', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test',
        role: Role.OPPORTUNITIES_MODERATOR,
      };

      jest.mocked(service.setRole).mockResolvedValue(mockUser);

      const result = await controller.setRole(
        Role.ADMIN,
        '1',
        Role.OPPORTUNITIES_MODERATOR,
      );

      expect(result).toEqual(mockUser);
      expect(service.setRole).toHaveBeenCalledWith(
        '1',
        Role.OPPORTUNITIES_MODERATOR,
      );
    });
  });
});
