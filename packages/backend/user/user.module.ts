import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [UserService, RolesGuard],
  exports: [UserService],
})
export class UserModule {}
