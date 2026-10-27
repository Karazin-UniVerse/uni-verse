import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { GripSessionService } from './grip-session.service';
import type { GripPrincipal } from './grip.types';

export interface RequestWithGripPrincipal {
  headers: Record<string, string | string[] | undefined>;
  gripPrincipal?: GripPrincipal;
  user?: unknown;
}

@Injectable()
export class GripGuard implements CanActivate {
  constructor(private readonly sessionService: GripSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithGripPrincipal>();
    const authHeader = request.headers.authorization;

    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    const token = authHeader.slice(7).trim();
    const principal = await this.sessionService.authenticate(token);

    request.gripPrincipal = principal;

    return true;
  }
}
