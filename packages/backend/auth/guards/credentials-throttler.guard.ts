import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AUTH_ROUTES } from '@universe/core/constants/routes';
import type { Request } from 'express';

type CredentialsBody = { email?: unknown; username?: unknown };

// Mirrors Moodle's PARAM_USERNAME cleaning, so spellings Moodle treats as one login share one bucket.
function toMoodleLogin(value: string): string {
  return value
    .replaceAll('\0', '')
    .trim()
    .toLowerCase()
    .replaceAll(/[^-.@_a-z0-9]/g, '');
}

// Keyed by the login each handler sends to Moodle, not the IP: browsers call the Cloud Run URL directly, so client IPs are not trustworthy here.
@Injectable()
export class CredentialsThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Request): Promise<string> {
    const body = request.body as CredentialsBody | undefined;
    const isMoodleLink = request.path.endsWith(`/${AUTH_ROUTES.MOODLE_LINK}`);
    const login = isMoodleLink ? body?.username : body?.email;
    const tracker = typeof login === 'string' ? toMoodleLogin(login) : '';

    return Promise.resolve(tracker || 'anonymous');
  }

  // One bucket per login across register, login and Moodle link: all three check the same Moodle password.
  protected generateKey(
    _context: ExecutionContext,
    tracker: string,
    throttlerName: string,
  ): string {
    return `credentials:${throttlerName}:${tracker}`;
  }
}
