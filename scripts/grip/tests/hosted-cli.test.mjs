import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runPrePush } from '../cli.mjs';

test('uses hosted collection without requiring a native executable', async () => {
  const settings = { token: 'enrolled' };
  const collected = { kind: 'review', diff: '+change' };
  const calls = [];
  const result = await runPrePush({
    settings,
    remoteUrl: 'destination',
    stdin: 'push records',
    collect: async (input) => {
      calls.push(input);

      return collected;
    },
    run: async (input) => {
      assert.equal(input.collected, collected);

      return 42;
    },
  });

  assert.equal(result, 42);
  assert.equal(calls[0].stdin, 'push records');
  assert.equal(calls[0].remoteUrl, 'destination');
});

test('does not upload deletion-only or excluded-only pushes', async () => {
  let dispatched = false;
  const result = await runPrePush({
    settings: {},
    remoteUrl: 'destination',
    stdin: '',
    collect: async () => ({ kind: 'noContent' }),
    run: async () => {
      dispatched = true;
    },
    logger: () => {},
  });

  assert.equal(result, 0);
  assert.equal(dispatched, false);
});

test('does not convert collection errors into fail-open', async () => {
  await assert.rejects(
    runPrePush({
      settings: {},
      remoteUrl: 'destination',
      stdin: '',
      collect: async () => {
        throw new Error('missing pushed object');
      },
    }),
    /missing pushed object/,
  );
});
