import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { GripServerClient } from '@uni-hub/services/grip-server-client';
import { gripError } from '../../helpers';

export async function GET(request: Request): Promise<Response> {
  const checkId = new URL(request.url).searchParams.get('checkId');

  if (!checkId || !/^[A-Za-z0-9_-]{43}$/.test(checkId)) {
    return new Response('Invalid check identifier', { status: 400 });
  }

  try {
    const browserBinding = randomBytes(32).toString('base64url');
    const client = new GripServerClient(process.env.GRIP_BACKEND_ORIGIN ?? '');
    const result = await client.start({ browserBinding, returnCheckId: checkId });
    const authorizationUrl = new URL(result.authorizationUrl);

    if (
      authorizationUrl.origin !== 'https://github.com' ||
      authorizationUrl.pathname !== '/login/oauth/authorize' ||
      authorizationUrl.username ||
      authorizationUrl.password ||
      authorizationUrl.hash
    ) {
      return new Response('Invalid authentication response', { status: 502 });
    }

    (await cookies()).set('grip_oauth_binding', browserBinding, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/dev-tools/grip',
      maxAge: 600,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: authorizationUrl.href,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error: unknown) {
    return gripError(error);
  }
}
