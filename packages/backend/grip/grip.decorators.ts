import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { GripPrincipal } from './grip.types';
import type { RequestWithGripPrincipal } from './grip.guard';

export const CurrentGripPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): GripPrincipal | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithGripPrincipal>();

    return request.gripPrincipal;
  },
);
