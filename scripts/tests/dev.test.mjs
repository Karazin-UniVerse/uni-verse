import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { isRetiredGripGateway, readEnvValue, resolveFrontendDevCommand } from '../dev.mjs';

test('resolveFrontendDevCommand maps https flag to script name', () => {
  assert.equal(resolveFrontendDevCommand(true), 'dev:https');
  assert.equal(resolveFrontendDevCommand(false), 'dev');
  assert.equal(resolveFrontendDevCommand(), 'dev');
});

test('readEnvValue extracts values from env file', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-env-test-'));
  const envPath = path.join(tmpDir, '.env');

  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  fs.writeFileSync(
    envPath,
    'PORT="3000"\nNEXT_PUBLIC_API_URL=\'https://api.universemvp.tech\'\nEMPTY_VAL=\nPLAIN_VAL=123\n',
  );

  assert.equal(readEnvValue(envPath, 'PORT'), '3000');
  assert.equal(readEnvValue(envPath, 'NEXT_PUBLIC_API_URL'), 'https://api.universemvp.tech');
  assert.equal(readEnvValue(envPath, 'PLAIN_VAL'), '123');
  assert.equal(readEnvValue(envPath, 'EMPTY_VAL'), '');
  assert.equal(readEnvValue(envPath, 'NON_EXISTENT'), null);
  assert.equal(readEnvValue(path.join(tmpDir, 'missing.env'), 'PORT'), null);
});

test('isRetiredGripGateway detects retired domains', () => {
  assert.equal(isRetiredGripGateway('https://gateway.code.run'), true);
  assert.equal(isRetiredGripGateway('https://northflank.app'), true);
  assert.equal(isRetiredGripGateway('https://api.universemvp.tech'), false);
  assert.equal(isRetiredGripGateway(''), false);
});
