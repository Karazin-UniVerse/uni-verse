import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GripCleanupGuard implements CanActivate {
  private readonly verifier = new OAuth2Client();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string } }>();
    const header = request.headers.authorization;
    const audience = process.env.GRIP_CLEANUP_OIDC_AUDIENCE;
    const email = process.env.GRIP_CLEANUP_SERVICE_ACCOUNT_EMAIL;

    if (!header?.startsWith('Bearer ') || !audience || !email) {
      throw new UnauthorizedException('Cleanup identity required');
    }

    try {
      const ticket = await this.verifier.verifyIdToken({
        idToken: header.slice(7),
        audience,
      });
      const payload = ticket.getPayload();

      if (
        !payload ||
        !['https://accounts.google.com', 'accounts.google.com'].includes(
          payload.iss,
        ) ||
        payload.aud !== audience ||
        payload.email !== email ||
        payload.email_verified !== true ||
        payload.exp <= Date.now() / 1000
      ) {
        throw new UnauthorizedException('Invalid cleanup identity');
      }

      return true;
    } catch {
      throw new UnauthorizedException('Invalid cleanup identity');
    }
  }
}
