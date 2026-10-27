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
} from '../grip/settings.mjs';

test('validateGatewayUrl enforces HTTPS or loopback and rejects userinfo/query/hash', () => {
  assert.equal(validateGatewayUrl('https://gateway.example.com'), 'https://gateway.example.com');
  assert.equal(validateGatewayUrl('https://gateway.example.com/'), 'https://gateway.example.com');
  assert.equal(validateGatewayUrl('http://localhost:3001'), 'http://localhost:3001');
  assert.equal(validateGatewayUrl('http://127.0.0.1:3001'), 'http://127.0.0.1:3001');

  assert.throws(() => validateGatewayUrl('http://insecure.example.com'));
  assert.throws(() => validateGatewayUrl('https://user:pass@gateway.example.com'));
  assert.throws(() => validateGatewayUrl('https://gateway.example.com?foo=bar'));
  assert.throws(() => validateGatewayUrl('https://gateway.example.com#fragment'));
  assert.throws(() => validateGatewayUrl('not-a-url'));
});

test('validateTokenFormat validates exact ugr_ prefix and 43 base64url characters', () => {
  const validToken = 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

  assert.equal(validateTokenFormat(validToken), true);
  assert.equal(validateTokenFormat('gho_notagriptoken'), false);
  assert.equal(validateTokenFormat('ugr_short'), false);
  assert.equal(validateTokenFormat('ugr_with!invalid@chars!!!!!!!!!!!!!!!!!!!!!!!'), false);
});

test('saveSettings, loadSettings and removeSettings work in isolated directory', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-settings-test-'));

  try {
    const validSettings = {
      version: 1,
      repoRoot: '/fake/repo',
      gatewayOrigin: 'https://gateway.example.com',
      clientId: 'client-123',
      token: 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      executable: process.execPath,
    };

    assert.equal(await loadSettings({ configDir: tmpDir, repoRoot: '/fake/repo' }), null);

    await saveSettings(validSettings, { configDir: tmpDir });

    const loaded = await loadSettings({ configDir: tmpDir, repoRoot: '/fake/repo' });

    assert.deepEqual(loaded, validSettings);

    // Foreign repo returns null
    assert.equal(await loadSettings({ configDir: tmpDir, repoRoot: '/another/repo' }), null);

    // Expired settings throw an error instead of silently disabling
    const expiredSettings = {
      ...validSettings,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };

    await saveSettings(expiredSettings, { configDir: tmpDir });
    await assert.rejects(loadSettings({ configDir: tmpDir, repoRoot: '/fake/repo' }), /expired/i);

    // Corrupt file throws an error instead of silently disabling
    const settingsPath = getSettingsPath({ configDir: tmpDir, repoRoot: '/fake/repo' });

    await fs.promises.writeFile(settingsPath, '{ invalid json');
    await assert.rejects(loadSettings({ configDir: tmpDir, repoRoot: '/fake/repo' }), /corrupt/i);

    // Remove settings
    await removeSettings({ configDir: tmpDir, repoRoot: '/fake/repo' });
    assert.equal(await loadSettings({ configDir: tmpDir, repoRoot: '/fake/repo' }), null);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
