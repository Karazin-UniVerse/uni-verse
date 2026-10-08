import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AtGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const request = context.switchToHttp?.()?.getRequest?.();
      const authHeader = request?.headers?.authorization;

      if (!authHeader) {
        return true;
      }
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    ...args: [unknown, unknown, unknown, ExecutionContext]
  ): TUser {
    const [err, user, , context] = args;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return (user || undefined) as TUser;
    }

    if (err || !user) {
      throw (err || new UnauthorizedException()) as Error;
    }

    return user as TUser;
  }
}
