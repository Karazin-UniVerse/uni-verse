import { ForbiddenException } from '@nestjs/common';
import { Role } from '@universe/database';

export function assertAdmin(roles?: string[]): void {
  if (!roles?.includes(Role.ADMIN)) {
    throw new ForbiddenException('Administrative privileges required');
  }
}
