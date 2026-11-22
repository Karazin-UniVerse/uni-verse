import { getPrismaErrorCode, getPrismaErrorName } from '../utils/prisma-error';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { User, Role } from '@universe/database';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, SelfUpdateUserDto, UpdateUserDto } from './user-dto';
import { randomUUID } from 'node:crypto';

function assertPairedMoodleCredentials(
  token: string | null | undefined,
  moodleId: string | null | undefined,
): void {
  if (token === undefined && moodleId === undefined) {
    return;
  }

  const hasToken = Boolean(token?.trim());
  const hasMoodleId = Boolean(moodleId?.trim());

  if (
    token === undefined ||
    moodleId === undefined ||
    hasToken !== hasMoodleId
  ) {
    throw new BadRequestException(
      'Moodle token and moodleId must be set or cleared together',
    );
  }
}

@Injectable()
export class UserService {
  private readonly inMemoryUsers = new Map<string, User>();

  constructor(private readonly prisma: PrismaService) {}

  private findInMemoryBy<K extends keyof User>(
    key: K,
    value: User[K],
  ): User | null {
    for (const user of this.inMemoryUsers.values()) {
      if (user[key] === value) {
        return user;
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
    assertPairedMoodleCredentials(createUserDto.token, createUserDto.moodleId);

    try {
      return await this.prisma.user.create({
        data: {
          ...createUserDto,
          password: createUserDto.password ?? '',
        },
      });
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
        password: createUserDto.password ?? '',
        roles: [Role.OPPORTUNITIES_USER],
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
    updateUserDto: Partial<
      UpdateUserDto & { refreshToken?: string | null; roles?: Role[] }
    >,
  ): Promise<User> {
    assertPairedMoodleCredentials(updateUserDto.token, updateUserDto.moodleId);

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

  async updateOwnProfile(
    currentUserId: string,
    targetUserId: string,
    dto: SelfUpdateUserDto,
  ): Promise<User> {
    if (!currentUserId || currentUserId !== targetUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const updatePayload: SelfUpdateUserDto = {};

    if (dto.name !== undefined) {
      updatePayload.name = dto.name;
    }

    if (dto.password) {
      updatePayload.password = await bcrypt.hash(dto.password, 10);
    }

    return this.updateUser(targetUserId, updatePayload);
  }

  async getUserTokenFromDB(email: string): Promise<string | null> {
    const user = await this.findByEmail(email);

    return user?.token ?? null;
  }
}
