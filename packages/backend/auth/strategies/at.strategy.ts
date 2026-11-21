import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JWT_ALGORITHM } from '../../constants/auth';

export type JwtPayload = {
  sub: string;
  email: string;
  roles?: string[];
};

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.AT_SECRET;

    if (!secret || secret === 'your-access-token-secret-key') {
      throw new Error('AT_SECRET environment variable is not set securely');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          (request?.cookies?.accessToken as string | undefined) ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: secret,
      algorithms: [JWT_ALGORITHM],
    });
  }

  // Roles come from the database so a revoked role or deleted user stops working before the token expires.
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      sub: payload.sub,
      email: payload.email,
      roles: user.roles,
    };
  }
}
