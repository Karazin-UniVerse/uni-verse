import { cookies } from 'next/headers';
import { GripServerClient, GripServerError } from '@grip/services/grip-server-client';

export function assertGripMutation(request: Request): void {
  const origin = process.env.GRIP_HOSTED_FRONTEND_ORIGIN;
  const csrf = request.headers.get('x-grip-csrf') ?? '';

  if (!origin || request.headers.get('origin') !== origin || !/^[A-Za-z0-9_-]{43}$/.test(csrf)) {
    throw new GripServerError(403);
  }
}

export async function gripRequestJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();

  if (!reader) throw new GripServerError(400);

  const chunks: Uint8Array[] = [];
  let length = 0;

  try {
    while (true) {
      const chunk = await reader.read();

      if (chunk.done) break;

      length += chunk.value.byteLength;

      if (length > 256 * 1024) {
        await reader.cancel();
        throw new GripServerError(413);
      }

      chunks.push(chunk.value);
    }

    const bytes = new Uint8Array(length);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }

    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof GripServerError) throw error;

    throw new GripServerError(400);
  } finally {
    reader.releaseLock();
  }
}

export async function gripBrowserContext(): Promise<{ token: string; client: GripServerClient }> {
  const token = (await cookies()).get('grip_browser')?.value;

  if (!token) {
    throw new GripServerError(401);
  }

  return { token, client: new GripServerClient(process.env.GRIP_BACKEND_ORIGIN ?? '') };
}

export function gripJson(value: object, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

export function gripError(error: unknown): Response {
  const status =
    error instanceof GripServerError && [400, 401, 403, 404, 409, 413, 429].includes(error.status)
      ? error.status
      : 502;

  return Response.json(
    { message: 'Hosted Grip request failed' },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        ...(status === 429 && error instanceof GripServerError && error.retryAfter
          ? { 'Retry-After': String(error.retryAfter) }
          : {}),
      },
    },
  );
}
