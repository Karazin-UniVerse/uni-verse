import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './user-dto';
import type { User } from '@universe/database';
import * as bcrypt from 'bcrypt';

function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    moodleId: user.moodleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  @Get()
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userService.getAllUsers();
    return users.map(toUserResponse);
  }

  @ApiOperation({ summary: 'Create user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @Post()
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    if (createUserDto?.password) {
      createUserDto.password = await bcrypt.hash(createUserDto.password, 10);
    }
    const created = await this.userService.createUser(createUserDto);
    return toUserResponse(created);
  }

  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<UserResponseDto> {
    const deleted = await this.userService.deleteUser(id);
    return toUserResponse(deleted);
  }

  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    if (updateUserDto?.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    const updated = await this.userService.updateUser(id, updateUserDto);
    return toUserResponse(updated);
  }
}
