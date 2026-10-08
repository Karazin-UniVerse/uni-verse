import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@universe/database';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiBearerAuth()
  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  getUsers(
    @GetUser('role') role: string,
  ): Promise<
    {
      id: string;
      email: string;
      name: string | null;
      role: Role;
      createdAt: Date;
    }[]
  > {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN can view users');
    }

    return this.adminService.getUsers();
  }

  @ApiBearerAuth()
  @Put('users/:id/role')
  @ApiOperation({ summary: 'Set user role' })
  setRole(
    @GetUser('role') callerRole: string,
    @Param('id') userId: string,
    @Body('role') newRole: Role,
  ): Promise<{ id: string; email: string; name: string | null; role: Role }> {
    if (callerRole !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN can change roles');
    }

    return this.adminService.setRole(userId, newRole);
  }
}
