import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@universe/database';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { sub?: unknown } | undefined;

    if (typeof user?.sub !== 'string' || !user.sub) {
      throw new ForbiddenException('Access denied');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { roles: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('Access denied');
    }

    const hasRequiredRole = requiredRoles.some((role) =>
      dbUser.roles.includes(role),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
