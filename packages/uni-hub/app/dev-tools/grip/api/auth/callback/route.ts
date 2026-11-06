import { cookies } from 'next/headers';
import { GripServerClient } from '@uni-hub/services/grip-server-client';

export async function GET(request: Request): Promise<Response> {
  const parameters = new URL(request.url).searchParams;
  const code = parameters.get('code');
  const state = parameters.get('state');
  const cookieStore = await cookies();
  const browserBinding = cookieStore.get('grip_oauth_binding')?.value;

  cookieStore.set('grip_oauth_binding', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/dev-tools/grip',
    maxAge: 0,
  });

  if (!code || !state || !browserBinding) {
    return new Response('Authentication could not be completed', {
      status: 401,
      headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    });
  }

  try {
    const result = await new GripServerClient(process.env.GRIP_BACKEND_ORIGIN ?? '').callback({
      browserBinding,
      code,
      state,
      previousSession: cookieStore.get('grip_browser')?.value,
    });

    if (
      !/^[A-Za-z0-9_-]{43}$/.test(result.token) ||
      !/^[A-Za-z0-9_-]{43}$/.test(result.returnCheckId)
    ) {
      throw new Error('Invalid authentication response');
    }

    cookieStore.set('grip_browser', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/dev-tools/grip',
      maxAge: 3_600,
    });

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/dev-tools/grip/boards/${result.returnCheckId}?sessionChanged=1`,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch {
    return new Response('Authentication could not be completed', {
      status: 401,
      headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    });
  }
}
