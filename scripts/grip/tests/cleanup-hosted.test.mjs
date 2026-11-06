import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runHostedCleanup } from '../cleanup-hosted.mjs';

test('awaits all bounded batches using workload identity and reports only completed cleanup', async () => {
  const requests = [];
  let calls = 0;
  const result = await runHostedCleanup({
    endpoint: 'https://backend.example/dev-tools/grip/internal/cleanup',
    audience: 'https://backend.example',
    createClient: async (audience) => {
      assert.equal(audience, 'https://backend.example');

      return {
        request: async (input) => {
          requests.push(input);
          calls += 1;

          return { data: { complete: calls === 2 } };
        },
      };
    },
  });

  assert.equal(result.batches, 2);
  assert.equal(result.complete, true);
  assert.ok(
    requests.every(
      (input) =>
        input.method === 'POST' &&
        input.url === 'https://backend.example/dev-tools/grip/internal/cleanup' &&
        input.maxRedirects === 0,
    ),
  );
});

test('refuses insecure, credential-bearing or non-cleanup endpoints before obtaining credentials', async () => {
  for (const endpoint of [
    'http://remote.example/dev-tools/grip/internal/cleanup',
    'https://secret@backend.example/dev-tools/grip/internal/cleanup',
    'https://backend.example/wrong',
  ]) {
    await assert.rejects(
      runHostedCleanup({
        endpoint,
        audience: 'https://backend.example',
        createClient: async () => {
          throw new Error('credentials accessed');
        },
      }),
      /Invalid cleanup endpoint/,
    );
  }
});

test('does not return success for an outage, malformed result or elapsed budget', async () => {
  await assert.rejects(
    runHostedCleanup({
      endpoint: 'https://backend.example/dev-tools/grip/internal/cleanup',
      audience: 'https://backend.example',
      createClient: async () => ({ request: async () => ({ data: {} }) }),
    }),
    /Invalid cleanup response/,
  );
  let now = 0;

  await assert.rejects(
    runHostedCleanup({
      endpoint: 'https://backend.example/dev-tools/grip/internal/cleanup',
      audience: 'https://backend.example',
      clock: () => now,
      createClient: async () => ({
        request: async () => {
          now = 121_000;

          return { data: { complete: false } };
        },
      }),
    }),
    /incomplete/,
  );
});
