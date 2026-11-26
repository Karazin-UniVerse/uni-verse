import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { isAllowedOrigin } from '../../utils/cors.config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getOriginFromReferer(referer: string): string | null {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const origin = request.headers.origin;

    if (typeof origin === 'string' && !isAllowedOrigin(origin)) {
      throw new ForbiddenException('Cross-site request origin denied');
    }

    const referer = request.headers.referer;

    if (!origin && typeof referer === 'string') {
      const refererOrigin = getOriginFromReferer(referer);

      if (!refererOrigin || !isAllowedOrigin(refererOrigin)) {
        throw new ForbiddenException('Cross-site request referer denied');
      }
    }

    const cookies = request.cookies as Record<string, unknown> | undefined;
    const hasAuthCookie = Boolean(
      cookies?.accessToken || cookies?.refreshToken,
    );
    const hasBearerAuth =
      typeof request.headers.authorization === 'string' &&
      /^Bearer\s+\S+/i.test(request.headers.authorization.trim());

    if (hasAuthCookie && !hasBearerAuth) {
      if (request.headers['x-requested-with'] !== 'XMLHttpRequest') {
        throw new ForbiddenException('Missing required CSRF header');
      }
    }

    return true;
  }
}
