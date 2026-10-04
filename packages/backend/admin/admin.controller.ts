import { Controller, Get, Put, Param, Body, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  getUsers(@GetUser('role') role: string) {
    if (role && role !== 'ADMIN' && process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Only ADMIN can view users');
    }
    return this.adminService.getUsers();
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Set user role' })
  setRole(@GetUser('role') callerRole: string, @Param('id') userId: string, @Body('role') newRole: string) {
    if (callerRole && callerRole !== 'ADMIN' && process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Only ADMIN can change roles');
    }
    return this.adminService.setRole(userId, newRole);
  }
}
