import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  getSettingsPath,
  loadSettings,
  removeSettings,
  saveSettings,
  validateGatewayUrl,
  validateTokenFormat,
} from '../settings.mjs';
import { initializeRepository } from './helpers.mjs';

test('validateGatewayUrl enforces HTTPS or loopback and rejects userinfo/query/hash', () => {
  assert.equal(validateGatewayUrl('https://gateway.example.com'), 'https://gateway.example.com');
  assert.equal(validateGatewayUrl('https://gateway.example.com/'), 'https://gateway.example.com');
  assert.equal(validateGatewayUrl('http://localhost:3001'), 'http://localhost:3001');
  assert.equal(validateGatewayUrl('http://127.0.0.1:3001'), 'http://127.0.0.1:3001');

  for (const value of [
    'http://insecure.example.com',
    'https://user:pass@gateway.example.com',
    'https://gateway.example.com?foo=bar',
    'https://gateway.example.com#fragment',
    'not-a-url',
    'https://gateway.example.com/foreign-path',
  ]) {
    assert.throws(() => validateGatewayUrl(value));
  }
});

test('validateTokenFormat validates exact ugr_ prefix and 43 base64url characters', () => {
  assert.equal(validateTokenFormat('ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'), true);
  assert.equal(validateTokenFormat('gho_notagriptoken'), false);
  assert.equal(validateTokenFormat('ugr_short'), false);
  assert.equal(validateTokenFormat('ugr_with!invalid@chars!!!!!!!!!!!!!!!!!!!!!!!'), false);
});

test('shared settings round-trip, fail closed on invalid profiles and can be removed', async (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'grip-settings-test-')));

  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  initializeRepository(root);

  const options = { configDir: path.join(root, 'config'), repoRoot: root };
  const settings = {
    version: 2,
    repository: 'Karazin-UniVerse/uni-verse',
    gatewayOrigin: 'https://gateway.example.com',
    clientId: 'client-123',
    token: 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    executable: process.execPath,
  };

  assert.equal(await loadSettings(options), null);
  await saveSettings(settings, options);
  assert.deepEqual(await loadSettings(options), settings);

  for (const [override, message] of [
    [{ version: 99 }, /unsupported grip enrollment version/i],
    [{ repository: 'another/project' }, /repository is invalid/i],
    [{ gatewayOrigin: 'https://gateway.example.com/foreign-path' }, /gateway URL is invalid/i],
    [{ gatewayOrigin: 'http://insecure-remote.example.com' }, /gateway URL is invalid/i],
    [{ token: 'bad-token-format' }, /token is invalid/i],
    [{ clientId: '' }, /OAuth client is invalid/i],
    [{ expiresAt: 'not-a-date' }, /expiration date is invalid/i],
    [{ expiresAt: new Date(Date.now() - 1000).toISOString() }, /expired/i],
  ]) {
    await saveSettings({ ...settings, ...override }, options);
    await assert.rejects(loadSettings(options), message);
  }

  await fs.promises.writeFile(getSettingsPath(options), '{ invalid json');
  await assert.rejects(loadSettings(options), /corrupt/i);
  await removeSettings(options);
  assert.equal(await loadSettings(options), null);
});
