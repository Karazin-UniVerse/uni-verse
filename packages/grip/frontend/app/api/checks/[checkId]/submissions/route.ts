import type { GripSubmissionRequest } from '@core/types/grip-hosted';
import {
  assertGripMutation,
  gripRequestJson,
  gripBrowserContext,
  gripError,
  gripJson,
} from '../../../helpers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ checkId: string }> },
): Promise<Response> {
  try {
    assertGripMutation(request);
    const { checkId } = await params;
    const { client, token } = await gripBrowserContext();
    const input = (await gripRequestJson(request)) as GripSubmissionRequest;

    const result = await client.submit({
      token,
      checkId,
      input,
      origin: request.headers.get('origin') ?? '',
      csrfToken: request.headers.get('x-grip-csrf') ?? '',
    });

    return gripJson(result.body, result.status);
  } catch (error: unknown) {
    return gripError(error);
  }
}
