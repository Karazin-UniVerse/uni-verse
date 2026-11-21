import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AUTH_ROUTES } from '@universe/core/constants/routes';
import type { Request } from 'express';

type CredentialsBody = { email?: unknown; username?: unknown };

// Mirrors Moodle's PARAM_USERNAME cleaning, so spellings Moodle treats as one login share one bucket.
// With `extendedusernamechars` on, Moodle keeps non-ASCII characters and internal spaces; off (its default), it strips them.
function toMoodleLogin(value: string): string {
  const cleaned = value.replaceAll('\0', '').trim().toLowerCase();

  if (process.env.MOODLE_EXTENDED_USERNAME_CHARS === 'true') {
    return cleaned;
  }

  // Non-extended PARAM_USERNAME strips whitespace and non-ASCII; logins made only of non-ASCII keep their compact form instead of all collapsing to ''.
  const compact = cleaned.replaceAll(/\s+/g, '');

  return compact.replaceAll(/[^-.@_a-z0-9]/g, '') || compact;
}

// Keyed by the login each handler sends to Moodle, not the IP: browsers call the Cloud Run URL directly, so client IPs are not trustworthy here.
@Injectable()
export class CredentialsThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Request): Promise<string> {
    const body = request.body as CredentialsBody | undefined;
    // Express matches routes case-insensitively and ignores one trailing slash, so compare the same way.
    const path = request.path.toLowerCase();
    const routeSuffix = `/${AUTH_ROUTES.MOODLE_LINK}`;
    const isMoodleLink =
      path.endsWith(routeSuffix) || path.endsWith(`${routeSuffix}/`);
    const login = isMoodleLink ? body?.username : body?.email;
    // Guards run before validation, so cap the key length here to bound throttler memory.
    const tracker =
      typeof login === 'string' ? toMoodleLogin(login).slice(0, 256) : '';

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
