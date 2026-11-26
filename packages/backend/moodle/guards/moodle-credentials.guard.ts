import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MoodleCredentialsGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as Record<string, unknown> | undefined;

    if (!user || typeof user.sub !== 'string' || !user.sub) {
      throw new UnauthorizedException('User identity is missing');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { token: true, moodleId: true },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User account not found');
    }

    if (!dbUser.token || !dbUser.moodleId) {
      throw new BadRequestException('Moodle account is not linked');
    }

    user.moodleToken = dbUser.token;
    user.moodleId = dbUser.moodleId;

    return true;
  }
}
