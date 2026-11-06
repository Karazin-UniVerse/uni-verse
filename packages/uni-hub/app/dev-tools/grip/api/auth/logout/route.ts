import { cookies } from 'next/headers';
import { assertGripMutation, gripBrowserContext, gripError } from '../../helpers';

export async function POST(request: Request): Promise<Response> {
  try {
    assertGripMutation(request);
    const { client, token } = await gripBrowserContext();

    await client.logout({
      token,
      origin: request.headers.get('origin') ?? '',
      csrfToken: request.headers.get('x-grip-csrf') ?? '',
    });
    (await cookies()).set('grip_browser', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/dev-tools/grip',
      maxAge: 0,
    });

    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    return gripError(error);
  }
}
