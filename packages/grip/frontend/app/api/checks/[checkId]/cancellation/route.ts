import { assertGripMutation, gripBrowserContext, gripError } from '../../../helpers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ checkId: string }> },
): Promise<Response> {
  try {
    assertGripMutation(request);
    const { checkId } = await params;
    const { client, token } = await gripBrowserContext();

    await client.cancel({
      token,
      checkId,
      origin: request.headers.get('origin') ?? '',
      csrfToken: request.headers.get('x-grip-csrf') ?? '',
    });

    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    return gripError(error);
  }
}
