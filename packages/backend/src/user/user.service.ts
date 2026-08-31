import { getPrismaErrorCode, getPrismaErrorName } from '../utils/prisma-error';
import { Injectable } from '@nestjs/common';
import { User, Role } from '@universe/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './user-dto';
import { randomUUID } from 'crypto';

@Injectable()
export class UserService {
  private readonly inMemoryUsers = new Map<string, User>();

  constructor(private readonly prisma: PrismaService) {}

  private findInMemoryBy<K extends keyof User>(
    key: K,
    value: User[K],
  ): User | null {
    for (const u of this.inMemoryUsers.values()) {
      if (u[key] === value) {
        return u;
      }
    }
    return null;
  }

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
      return this.findInMemoryBy('email', email);
    }
  }

  async findByMoodleId(moodleId: string): Promise<User | null> {
    try {
      return await this.prisma.user.findFirst({ where: { moodleId } });
    } catch {
      return this.findInMemoryBy('moodleId', moodleId);
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
    } catch (err: unknown) {
      const code = getPrismaErrorCode(err);
      const name = getPrismaErrorName(err);

      if (code === 'P2002' || name === 'PrismaClientValidationError') {
        throw err;
      }

      // Fallback: When Prisma/PostgreSQL is disconnected (offline demo/testing),
      // store user in-memory with generated UUID and current timestamp.
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

      if (!existing) {
        throw new Error('User not found');
      }

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
    } catch (err: unknown) {
      if (getPrismaErrorCode(err) === 'P2025') {
        throw err;
      }

      const existing = this.inMemoryUsers.get(id);

      if (!existing) {
        throw err;
      }

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
