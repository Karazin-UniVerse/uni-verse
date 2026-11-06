import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runHostedPush } from '../hosted-hook.mjs';
import { createGripBindingDigest } from '../../../packages/core/utils/grip-hosted.ts';

const settings = {
  gatewayOrigin: 'https://backend.example',
  token: 'private-token',
  frontendOrigin: 'https://portal.example',
};
const collected = {
  kind: 'review',
  manifest: {
    repository: 'Karazin-UniVerse/uni-verse',
    updates: [
      {
        localRef: 'refs/heads/a',
        remoteRef: 'refs/heads/a',
        localOid: 'a'.repeat(40),
        remoteOid: 'b'.repeat(40),
      },
    ],
    policyVersion: 'hosted-v1',
    diffDigest: 'c'.repeat(64),
  },
  diff: '+change',
  files: ['handler.ts'],
  truncated: false,
};

async function check(state = 'READY') {
  return {
    checkId: 'a'.repeat(43),
    state,
    bindingDigest: await createGripBindingDigest(collected.manifest),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    passValidUntil: new Date(Date.now() + 86_400_000).toISOString(),
    policyVersion: 'hosted-v1',
  };
}

test('opens a hosted HTTPS link and waits for a matching server pass without native Grip', async () => {
  const status = await check();
  const urls = [];
  const calls = [];
  const logs = [];
  const fetchFn = async (url, options) => {
    calls.push({ url, options });

    if (url.endsWith('/checks'))
      return Response.json({
        ...status,
        boardUrl: `https://portal.example/dev-tools/grip/boards/${status.checkId}`,
      });

    if (url.endsWith('/generation')) return Response.json(status);

    return Response.json({ ...status, state: 'PASSED', score: 70 });
  };
  const result = await runHostedPush({
    settings,
    collected,
    fetchFn,
    openBrowser: (url) => urls.push(url),
    logger: (line) => logs.push(line),
    wait: async () => {},
  });

  assert.equal(result, 0);
  assert.deepEqual(urls, [`https://portal.example/dev-tools/grip/boards/${status.checkId}`]);
  assert.ok(logs.some((line) => line.includes('https://portal.example')));
  assert.equal(calls.length, 3);
  assert.ok(calls.every(({ options }) => options.redirect === 'error'));
  assert.ok(logs.every((line) => !line.includes(settings.token)));
});

for (const state of ['FAILED', 'CANCELLED', 'EXPIRED', 'QUOTA_REJECTED']) {
  test(`blocks a persisted ${state} result`, async () => {
    const status = await check(state);

    assert.equal(
      await runHostedPush({
        settings,
        collected,
        fetchFn: async () =>
          Response.json({
            ...status,
            boardUrl: `https://portal.example/dev-tools/grip/boards/${status.checkId}`,
          }),
        openBrowser: () => {},
        logger: () => {},
      }),
      1,
    );
  });
}

test('permits a technical outage only as unverified and blocks authorization errors', async () => {
  const logs = [];

  assert.equal(
    await runHostedPush({
      settings,
      collected,
      fetchFn: async () => {
        throw new TypeError('Network unavailable');
      },
      logger: (line) => logs.push(line),
    }),
    0,
  );
  assert.ok(logs.some((line) => line.includes('UNVERIFIED')));
  assert.equal(
    await runHostedPush({
      settings,
      collected,
      fetchFn: async () => new Response('', { status: 401 }),
      logger: () => {},
    }),
    1,
  );
});

test('blocks a mismatched digest or policy instead of failing open', async () => {
  const status = await check('PASSED');

  for (const difference of [{ bindingDigest: 'forged' }, { policyVersion: 'other' }]) {
    assert.equal(
      await runHostedPush({
        settings,
        collected,
        fetchFn: async () =>
          Response.json({
            ...status,
            ...difference,
            boardUrl: `https://portal.example/dev-tools/grip/boards/${status.checkId}`,
          }),
        logger: () => {},
      }),
      1,
    );
  }
});

test('does not treat cancellation as an outage', async () => {
  const controller = new AbortController();

  controller.abort();
  assert.equal(
    await runHostedPush({
      settings,
      collected,
      signal: controller.signal,
      fetchFn: async () => {
        throw controller.signal.reason;
      },
      logger: () => {},
    }),
    1,
  );
});

test('recovers a lost generation response by reading the persisted denial', async () => {
  const status = await check();
  let generations = 0;
  const result = await runHostedPush({
    settings,
    collected,
    openBrowser: () => {},
    logger: () => {},
    wait: async () => {},
    fetchFn: async (url) => {
      if (url.endsWith('/checks'))
        return Response.json({
          ...status,
          boardUrl: `https://portal.example/dev-tools/grip/boards/${status.checkId}`,
        });

      if (url.endsWith('/generation')) {
        generations += 1;
        throw new TypeError('response lost');
      }

      return Response.json({ ...status, state: 'QUOTA_REJECTED', reason: 'PROVIDER_QUOTA' });
    },
  });

  assert.equal(result, 1);
  assert.equal(generations, 1);
});

test('retries a lost create response with exactly the same intent', async () => {
  const status = await check('PASSED');
  const bodies = [];
  const result = await runHostedPush({
    settings,
    collected,
    logger: () => {},
    fetchFn: async (_url, options) => {
      bodies.push(options.body);

      if (bodies.length === 1) throw new TypeError('response lost');

      return Response.json({ ...status, score: 70 });
    },
  });

  assert.equal(result, 0);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0], bodies[1]);
});

test('waits for a read throttle but does not reinterpret a POST quota rejection', async () => {
  const status = await check();
  const delays = [];
  let reads = 0;
  const result = await runHostedPush({
    settings,
    collected,
    openBrowser: () => {},
    logger: () => {},
    wait: async (duration) => delays.push(duration),
    fetchFn: async (url) => {
      if (url.endsWith('/checks'))
        return Response.json({
          ...status,
          boardUrl: `https://portal.example/dev-tools/grip/boards/${status.checkId}`,
        });

      if (url.endsWith('/generation')) return Response.json(status);

      reads += 1;

      return reads === 1
        ? new Response('', { status: 429, headers: { 'Retry-After': '7' } })
        : Response.json({ ...status, state: 'PASSED', score: 70 });
    },
  });

  assert.equal(result, 0);
  assert.deepEqual(delays, [7000]);
  assert.equal(
    await runHostedPush({
      settings,
      collected,
      logger: () => {},
      fetchFn: async () => new Response('', { status: 429 }),
    }),
    1,
  );
});

test('blocks malformed or unsupported board URLs instead of treating them as an outage', async () => {
  const status = await check();

  for (const boardUrl of [
    'not a URL',
    'https://user:password@portal.example/dev-tools/grip/boards/' + status.checkId,
    'https://portal.example/wrong',
  ]) {
    assert.equal(
      await runHostedPush({
        settings,
        collected,
        logger: () => {},
        fetchFn: async () => Response.json({ ...status, boardUrl }),
      }),
      1,
    );
  }
});

test('attempts bounded cancellation after a started check is interrupted', async () => {
  const status = await check();
  const controller = new AbortController();
  const routes = [];
  const result = await runHostedPush({
    settings,
    collected,
    signal: controller.signal,
    openBrowser: () => {},
    logger: () => {},
    fetchFn: async (url) => {
      routes.push(url);

      if (url.endsWith('/checks'))
        return Response.json({
          ...status,
          boardUrl: `https://portal.example/dev-tools/grip/boards/${status.checkId}`,
        });

      if (url.endsWith('/cancellation')) return new Response(null, { status: 204 });

      controller.abort();
      throw controller.signal.reason;
    },
  });

  assert.equal(result, 1);
  assert.ok(routes.at(-1).endsWith('/cancellation'));
});

test('blocks a status timeout crossing the defense deadline instead of failing open', async (context) => {
  const status = await check();
  let now = Date.now();

  context.mock.method(Date, 'now', () => now);
  const result = await runHostedPush({
    settings,
    collected,
    logger: () => {},
    openBrowser: () => {},
    fetchFn: async (url) => {
      if (url.endsWith('/checks'))
        return Response.json({
          ...status,
          boardUrl: `https://portal.example/dev-tools/grip/boards/${status.checkId}`,
        });

      if (url.endsWith('/generation')) return Response.json(status);

      now = Date.parse(status.expiresAt) + 1;
      throw new DOMException('Status timed out', 'TimeoutError');
    },
  });

  assert.equal(result, 1);
});

test('prints the omitted-content warning before opening a truncated defense', async () => {
  const status = await check('PASSED');
  const logs = [];

  await runHostedPush({
    settings,
    collected: { ...collected, truncated: true },
    logger: (line) => logs.push(line),
    fetchFn: async () => Response.json({ ...status, score: 70 }),
  });
  assert.match(logs[0], /truncated|omitted/i);
});

test('never opens an untrusted hosted origin returned by the gateway', async () => {
  const status = await check();
  let opened = false;
  const result = await runHostedPush({
    settings: { ...settings, frontendOrigin: 'https://portal.example' },
    collected,
    logger: () => {},
    openBrowser: () => {
      opened = true;
    },
    fetchFn: async () =>
      Response.json({
        ...status,
        boardUrl: `https://attacker.example/dev-tools/grip/boards/${status.checkId}`,
      }),
  });

  assert.equal(result, 1);
  assert.equal(opened, false);
});

test('fails closed on an explicit configuration-policy 403', async () => {
  let calls = 0;
  const result = await runHostedPush({
    settings,
    collected,
    logger: () => {},
    fetchFn: async () => {
      calls += 1;

      return new Response('', { status: 403 });
    },
  });

  assert.equal(result, 1);
  assert.equal(calls, 1);
});

test('blocks a malformed origin before network traffic', async () => {
  let calls = 0;
  const result = await runHostedPush({
    settings: { ...settings, frontendOrigin: undefined },
    collected,
    logger: () => {},
    fetchFn: async () => {
      calls += 1;
      throw new Error('unexpected');
    },
  });

  assert.equal(result, 1);
  assert.equal(calls, 0);
});
