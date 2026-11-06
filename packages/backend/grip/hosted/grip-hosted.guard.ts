import { Injectable, NotFoundException } from '@nestjs/common';
import type { CanActivate } from '@nestjs/common';
import { getGripHostedConfig } from './grip-hosted.config';
import type { GripHostedConfig } from './grip-hosted.types';

export function requireGripHostedConfig(): GripHostedConfig {
  const config = getGripHostedConfig(process.env);

  if (!config) {
    throw new NotFoundException('Hosted Grip is not enabled');
  }

  return config;
}

@Injectable()
export class GripHostedGuard implements CanActivate {
  canActivate(): boolean {
    requireGripHostedConfig();

    return true;
  }
}
