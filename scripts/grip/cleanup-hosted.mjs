import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requireBackend = createRequire(
  new URL('../../packages/backend/package.json', import.meta.url),
);

async function workloadClient(audience) {
  const { GoogleAuth } = requireBackend('google-auth-library');

  return new GoogleAuth().getIdTokenClient(audience);
}

export async function runHostedCleanup({
  endpoint,
  audience,
  createClient = workloadClient,
  clock = Date.now,
}) {
  const url = new URL(endpoint);

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/dev-tools/grip/internal/cleanup'
  ) {
    throw new Error('Invalid cleanup endpoint');
  }

  if (!audience) throw new Error('Cleanup OIDC audience is required');

  const deadline = clock() + 120_000;
  const client = await createClient(audience);
  let batches = 0;

  while (clock() < deadline) {
    const response = await client.request({
      url: url.href,
      method: 'POST',
      maxRedirects: 0,
      retry: false,
      timeout: Math.min(30_000, deadline - clock()),
    });

    if (typeof response.data?.complete !== 'boolean') throw new Error('Invalid cleanup response');

    batches += 1;

    if (response.data.complete) return { complete: true, batches };
  }

  throw new Error('Hosted cleanup incomplete after its invocation budget');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runHostedCleanup({
      endpoint: process.env.GRIP_CLEANUP_ENDPOINT,
      audience: process.env.GRIP_CLEANUP_OIDC_AUDIENCE,
    });

    console.info(`[grip] Cleanup complete (${result.batches} batches).`);
  } catch {
    console.error(
      '[grip] Cleanup failed or incomplete. Inspect scheduler/database health; do not enable hosted mode.',
    );
    process.exitCode = 1;
  }
}
