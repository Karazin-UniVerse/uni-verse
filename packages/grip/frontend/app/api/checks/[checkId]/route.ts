import { gripBrowserContext, gripError, gripJson } from '../../helpers';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ checkId: string }> },
): Promise<Response> {
  try {
    const { checkId } = await params;
    const { client, token } = await gripBrowserContext();

    return gripJson(await client.view(token, checkId));
  } catch (error: unknown) {
    return gripError(error);
  }
}
