import { Injectable } from '@nestjs/common';
import { User } from '@universe/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './user-dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({ data: createUserDto });
  }

  async deleteUser(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async updateUser(
    id: string,
    updateUserDto: Partial<UpdateUserDto & { refreshToken?: string | null }>,
  ): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: updateUserDto });
  }
  async getUserTokenFromDB(email: string): Promise<string | null> {
    const user = await this.findByEmail(email);
    return user?.token ?? null;
  }
}
