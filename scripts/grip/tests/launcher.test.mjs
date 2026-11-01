import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runGripHook } from '../launcher.mjs';

test('runGripHook throws if settings are missing or expired', async () => {
  await assert.rejects(
    runGripHook({
      settings: null,
      args: [],
    }),
    /not enrolled/i,
  );

  const expiredSettings = {
    executable: process.execPath,
    gatewayOrigin: 'https://gateway.example.com',
    token: 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  };

  await assert.rejects(
    runGripHook({
      settings: expiredSettings,
      args: [],
    }),
    /enrollment has expired/i,
  );
});

test('runGripHook throws if executable does not exist', async () => {
  const settings = {
    executable: '/non/existent/path/grip.exe',
    gatewayOrigin: 'https://gateway.example.com',
    token: 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  await assert.rejects(
    runGripHook({
      settings,
      args: [],
    }),
    /executable not found/i,
  );
});

test('runGripHook rejects .bat and .cmd shims on Windows', async () => {
  if (process.platform !== 'win32') {
    return;
  }

  const settings = {
    executable: 'C:\\Windows\\System32\\cmd.exe', // will be overridden to bat below
    gatewayOrigin: 'https://gateway.example.com',
    token: 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  // Point to an existing bat file
  const tmpBat = path.join(os.tmpdir(), 'test-shim.bat');

  fs.writeFileSync(tmpBat, '@echo off\n');

  try {
    await assert.rejects(
      runGripHook({
        settings: { ...settings, executable: tmpBat },
        args: [],
      }),
      /Only native binary executables/i,
    );
  } finally {
    fs.rmSync(tmpBat, { force: true });
  }
});

test('runGripHook populates gateway credentials without inheriting provider secrets', async (context) => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousKeys = process.env.GEMINI_API_KEYS;

  context.after(() => {
    for (const [name, value] of [
      ['GEMINI_API_KEY', previousKey],
      ['GEMINI_API_KEYS', previousKeys],
    ]) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });
  process.env.GEMINI_API_KEY = 'legacy-secret';
  process.env.GEMINI_API_KEYS = 'first-secret,second-secret';

  const captured = {};
  const fakeSpawn = (exe, args, options) => {
    captured.exe = exe;
    captured.args = args;
    captured.options = options;

    return {
      on: (event, cb) => {
        if (event === 'close') {
          process.nextTick(() => cb(0));
        }
      },
    };
  };

  const settings = {
    executable: process.execPath,
    gatewayOrigin: 'https://gateway.example.com',
    token: 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  const exitCode = await runGripHook({
    settings,
    args: ['arg1', 'arg2'],
    spawnFn: fakeSpawn,
  });

  assert.equal(exitCode, 0);
  assert.equal(captured.exe, process.execPath);
  assert.deepEqual(captured.args, ['arg1', 'arg2']);
  assert.equal(captured.options.shell, false);
  assert.equal(captured.options.env.GRIP_PROVIDER, 'openai');
  assert.equal(captured.options.env.GRIP_MODEL, 'gemini-3.5-flash-lite');
  assert.equal(captured.options.env.GRIP_BASE_URL, 'https://gateway.example.com/dev-tools/grip/v1');
  assert.equal(captured.options.env.GRIP_API_KEY_ENV, 'GRIP_GATEWAY_TOKEN');
  assert.equal(
    captured.options.env.GRIP_GATEWAY_TOKEN,
    'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
  );
  assert.equal(captured.options.env.GEMINI_API_KEY, undefined);
  assert.equal(captured.options.env.GEMINI_API_KEYS, undefined);
});
