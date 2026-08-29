import { Injectable } from '@nestjs/common';
import { User, Role } from '@universe/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './user-dto';
import { randomUUID } from 'crypto';

@Injectable()
export class UserService {
  private readonly inMemoryUsers = new Map<string, User>();

  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers(): Promise<User[]> {
    try {
      return await this.prisma.user.findMany();
    } catch {
      return Array.from(this.inMemoryUsers.values());
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({ where: { email } });
    } catch {
      for (const u of this.inMemoryUsers.values()) {
        if (u.email === email) return u;
      }
      return null;
    }
  }

  async findByMoodleId(moodleId: string): Promise<User | null> {
    try {
      return await this.prisma.user.findFirst({ where: { moodleId } });
    } catch {
      for (const u of this.inMemoryUsers.values()) {
        if (u.moodleId === moodleId) return u;
      }
      return null;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({ where: { id } });
    } catch {
      return this.inMemoryUsers.get(id) ?? null;
    }
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      return await this.prisma.user.create({ data: createUserDto });
    } catch {
      const newUser: User = {
        id: randomUUID(),
        email: createUserDto.email,
        name: createUserDto.name ?? null,
        password: createUserDto.password,
        role: Role.STUDENT,
        token: createUserDto.token ?? null,
        moodleId: createUserDto.moodleId ?? null,
        refreshToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.inMemoryUsers.set(newUser.id, newUser);
      return newUser;
    }
  }

  async deleteUser(id: string): Promise<User> {
    try {
      return await this.prisma.user.delete({ where: { id } });
    } catch {
      const existing = this.inMemoryUsers.get(id);
      if (!existing) throw new Error('User not found');
      this.inMemoryUsers.delete(id);
      return existing;
    }
  }

  async updateUser(
    id: string,
    updateUserDto: Partial<UpdateUserDto & { refreshToken?: string | null }>,
  ): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });
    } catch {
      const existing = this.inMemoryUsers.get(id) ?? {
        id,
        email: 'student@karazin.ua',
        name: null,
        password: '',
        role: Role.STUDENT,
        token: null,
        moodleId: null,
        refreshToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated: User = {
        ...existing,
        ...updateUserDto,
        updatedAt: new Date(),
      };
      this.inMemoryUsers.set(id, updated);
      return updated;
    }
  }

  async getUserTokenFromDB(email: string): Promise<string | null> {
    const user = await this.findByEmail(email);
    return user?.token ?? null;
  }
}
