import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const secret = process.env.RT_SECRET;
    if (!secret) {
      throw new Error('RT_SECRET environment variable is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const data = request?.cookies?.refreshToken as string | undefined;
          if (!data) {
            return null;
          }
          return data;
        },
      ]),
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: Record<string, unknown>,
  ): Record<string, unknown> & { refreshToken: string } {
    const refreshToken = req.cookies.refreshToken as string;
    return { ...payload, refreshToken };
  }
}
