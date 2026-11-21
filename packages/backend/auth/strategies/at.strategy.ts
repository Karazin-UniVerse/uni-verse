import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_ALGORITHM } from '../../constants/auth';
import { UserService } from '../../user/user.service';

export type JwtPayload = {
  sub: string;
  email: string;
  roles?: string[];
};

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly userService: UserService) {
    const secret = process.env.AT_SECRET;

    if (!secret || secret === 'your-access-token-secret-key') {
      throw new Error('AT_SECRET environment variable is not set securely');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) =>
          (request?.cookies?.accessToken as string | undefined) ?? null,
      ]),
      secretOrKey: secret,
      algorithms: [JWT_ALGORITHM],
    });
  }

  // Roles come from the user store so a revoked role or deleted user stops working before the token expires.
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.userService.findById(payload.sub);

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
