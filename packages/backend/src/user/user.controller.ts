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
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CreateUserDto, UpdateUserDto } from './user-dto';
import * as bcrypt from 'bcrypt';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @ApiOperation({ summary: 'Get all users' })
  @Get()
  async getAllUsers() {
    return await this.userService.getAllUsers();
  }
  @ApiOperation({ summary: 'Create user' })
  @ApiBody({ type: CreateUserDto })
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    if (createUserDto?.password) {
      createUserDto.password = await bcrypt.hash(createUserDto.password, 10);
    }
    return await this.userService.createUser(createUserDto);
  }
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @Delete()
  async deleteUser(@Param('id') id: string) {
    return await this.userService.deleteUser(id);
  }
  @ApiOperation({ summary: 'Update user' })
  @ApiBody({ type: UpdateUserDto })
  @Patch()
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    if (updateUserDto?.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    return await this.userService.updateUser(id, updateUserDto);
  }
}
