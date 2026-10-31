import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  loadSettings,
  saveSettings,
  removeSettings,
  getSettingsPath,
  migrateSettings,
} from '../settings.mjs';
import { initializeRepository } from './helpers.mjs';

const cliPath = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const repository = 'Karazin-UniVerse/uni-verse';

function createFixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'grip-enrollment-')));

  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const first = path.join(root, 'first');
  const second = path.join(root, 'second');
  const configDir = path.join(root, 'universe-grip');

  initializeRepository(first);
  initializeRepository(second, 'git@github.com:Karazin-UniVerse/uni-verse.git');

  return { root, first, second, configDir };
}

function createSettings() {
  return {
    version: 2,
    repository,
    gatewayOrigin: 'https://gateway.example.com',
    clientId: 'client-123',
    token: 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    executable: process.execPath,
  };
}

test('one enrollment works across branches, clones and linked worktrees; removal is shared', async (t) => {
  const { first, second, configDir, root } = createFixture(t);
  const settings = createSettings();

  await saveSettings(settings, { configDir, repoRoot: first });
  assert.deepEqual(await loadSettings({ configDir, repoRoot: second }), settings);

  for (const args of [
    [
      '-C',
      first,
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '--allow-empty',
      '-m',
      'fixture',
    ],
    ['-C', first, 'switch', '-c', 'another-branch'],
    ['-C', first, 'worktree', 'add', '-b', 'linked-branch', path.join(root, 'linked')],
  ]) {
    const result = spawnSync('git', args, { encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
  }

  assert.deepEqual(await loadSettings({ configDir, repoRoot: first }), settings);
  assert.deepEqual(
    await loadSettings({ configDir, repoRoot: path.join(root, 'linked') }),
    settings,
  );
  await removeSettings({ configDir, repoRoot: second });
  assert.equal(await loadSettings({ configDir, repoRoot: first }), null);
});

test('shared enrollment is not available to another repository or credential-bearing origin', async (t) => {
  const { first, configDir, root } = createFixture(t);

  await saveSettings(createSettings(), { configDir, repoRoot: first });

  for (const [index, remote] of [
    'https://github.com/another/project.git',
    'https://github.com.evil.example/Karazin-UniVerse/uni-verse.git',
    'https://user:secret@github.com/Karazin-UniVerse/uni-verse.git',
  ].entries()) {
    const directory = path.join(root, `unrelated-${index}`);

    initializeRepository(directory, remote);
    await assert.rejects(loadSettings({ configDir, repoRoot: directory }), /repository/i);
  }
});

test('explicit migration reuses only the current checkout token for the matching gateway and OAuth client', async (t) => {
  const { first, second, root, configDir } = createFixture(t);
  const settings = createSettings();
  const legacy = { ...settings, version: 1, repoRoot: first };

  delete legacy.repository;
  const legacyPath = path.join(
    configDir,
    `${crypto.createHash('sha256').update(first).digest('hex')}.json`,
  );

  fs.mkdirSync(configDir);
  fs.writeFileSync(legacyPath, JSON.stringify(legacy));

  const run = (gateway, client) =>
    spawnSync(
      process.execPath,
      [cliPath, 'setup', '--migrate', '--gateway', gateway, '--client-id', client],
      {
        cwd: first,
        env: { ...process.env, APPDATA: root, XDG_CONFIG_HOME: root },
        encoding: 'utf8',
      },
    );

  assert.equal(await loadSettings({ configDir, repoRoot: second }), null);

  for (const [gateway, client] of [
    ['https://other.example.com', settings.clientId],
    [settings.gatewayOrigin, 'other-client'],
  ]) {
    const rejected = run(gateway, client);

    assert.notEqual(rejected.status, 0);
    assert.equal(fs.existsSync(legacyPath), true);
    assert.equal(fs.existsSync(getSettingsPath({ configDir })), false);
  }

  const result = run(settings.gatewayOrigin, settings.clientId);

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(settings.token));
  assert.deepEqual(await loadSettings({ configDir, repoRoot: second }), settings);
  assert.equal(fs.existsSync(legacyPath), false);

  fs.writeFileSync(legacyPath, JSON.stringify(legacy));

  const repeated = run(settings.gatewayOrigin, settings.clientId);

  assert.notEqual(repeated.status, 0);
  assert.match(repeated.stderr, /already exists/i);
  assert.equal(fs.existsSync(legacyPath), true);
  assert.deepEqual(await loadSettings({ configDir, repoRoot: second }), settings);
});

test('a push to an unrelated destination cannot use a valid shared enrollment', async (t) => {
  const { first, root, configDir } = createFixture(t);
  const settings = createSettings();

  await saveSettings(settings, { configDir, repoRoot: first });

  const result = spawnSync(
    process.execPath,
    [cliPath, 'hook', 'pre-push', 'other', 'https://github.com/another/project.git'],
    {
      cwd: first,
      env: { ...process.env, CI: '', APPDATA: root, XDG_CONFIG_HOME: root },
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /repository/i);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(settings.token));
});

test('migration fails closed on invalid, expired, mismatched or absent legacy enrollment', (t) => {
  const { first, root, configDir } = createFixture(t);
  const settings = createSettings();
  const legacy = { ...settings, version: 1, repoRoot: first };
  const legacyPath = path.join(
    configDir,
    `${crypto.createHash('sha256').update(first).digest('hex')}.json`,
  );

  delete legacy.repository;
  fs.mkdirSync(configDir);

  for (const content of [
    '{ corrupt',
    JSON.stringify({ ...legacy, expiresAt: new Date(Date.now() - 1000).toISOString() }),
    JSON.stringify({ ...legacy, repoRoot: path.join(root, 'other') }),
    JSON.stringify({ ...legacy, token: 'invalid' }),
    null,
  ]) {
    if (content === null) {
      fs.unlinkSync(legacyPath);
    } else {
      fs.writeFileSync(legacyPath, content);
    }

    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        'setup',
        '--migrate',
        '--gateway',
        settings.gatewayOrigin,
        '--client-id',
        settings.clientId,
      ],
      {
        cwd: first,
        env: { ...process.env, APPDATA: root, XDG_CONFIG_HOME: root },
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 1);
    assert.equal(fs.existsSync(getSettingsPath({ configDir })), false);
    assert.equal(fs.existsSync(legacyPath), content !== null);
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(settings.token));
  }
});

test('setup defaults --gateway to https://api.universemvp.tech when omitted in migration', async (t) => {
  const { first, second, configDir, root } = createFixture(t);
  const settings = createSettings();

  settings.gatewayOrigin = 'https://api.universemvp.tech';
  const legacy = { ...settings, version: 1, repoRoot: first };

  delete legacy.repository;
  const legacyPath = path.join(
    configDir,
    `${crypto.createHash('sha256').update(first).digest('hex')}.json`,
  );

  fs.mkdirSync(configDir);
  fs.writeFileSync(legacyPath, JSON.stringify(legacy));

  const result = spawnSync(
    process.execPath,
    [cliPath, 'setup', '--migrate', '--client-id', settings.clientId],
    {
      cwd: first,
      env: { ...process.env, APPDATA: root, XDG_CONFIG_HOME: root },
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Gateway: https:\/\/api\.universemvp\.tech/);
  assert.deepEqual(await loadSettings({ configDir, repoRoot: second }), settings);
});

test('concurrent migrations publish only one profile and preserve the losing legacy enrollment', async (t) => {
  const { first, second, configDir } = createFixture(t);
  const settings = createSettings();
  const roots = [first, second];
  const legacyPaths = roots.map((repoRoot) =>
    path.join(configDir, `${crypto.createHash('sha256').update(repoRoot).digest('hex')}.json`),
  );

  fs.mkdirSync(configDir);
  roots.forEach((repoRoot, index) => {
    const legacy = { ...settings, version: 1, repoRoot, clientId: `client-${index}` };

    delete legacy.repository;
    fs.writeFileSync(legacyPaths[index], JSON.stringify(legacy));
  });

  const writeFile = fs.promises.writeFile.bind(fs.promises);
  let publishedTemps = 0;
  let release;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });

  t.mock.method(fs.promises, 'writeFile', async (...args) => {
    await writeFile(...args);

    if (String(args[0]).endsWith('.tmp')) {
      publishedTemps++;

      if (publishedTemps === 2) {
        release();
      }

      await barrier;
    }
  });

  const results = await Promise.allSettled(
    roots.map((repoRoot, index) =>
      migrateSettings({
        configDir,
        repoRoot,
        gatewayOrigin: settings.gatewayOrigin,
        clientId: `client-${index}`,
      }),
    ),
  );

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const winner = results.findIndex((result) => result.status === 'fulfilled');
  const loser = winner === 0 ? 1 : 0;

  assert.equal(fs.existsSync(legacyPaths[winner]), false);
  assert.equal(fs.existsSync(legacyPaths[loser]), true);
  assert.equal((await loadSettings({ configDir, repoRoot: first })).clientId, `client-${winner}`);
  assert.equal(
    fs.readdirSync(configDir).some((file) => file.endsWith('.tmp')),
    false,
  );
});

test('migration reports active shared enrollment when only legacy cleanup fails', async (t) => {
  const { first, second, configDir } = createFixture(t);
  const settings = createSettings();
  const legacy = { ...settings, version: 1, repoRoot: first };
  const legacyPath = path.join(
    configDir,
    `${crypto.createHash('sha256').update(first).digest('hex')}.json`,
  );

  delete legacy.repository;
  fs.mkdirSync(configDir);
  fs.writeFileSync(legacyPath, JSON.stringify(legacy));

  const unlink = fs.promises.unlink.bind(fs.promises);
  const warnings = [];

  t.mock.method(console, 'warn', (message) => warnings.push(message));
  t.mock.method(fs.promises, 'unlink', async (filePath) => {
    if (filePath === legacyPath) {
      throw Object.assign(new Error('read-only fixture'), { code: 'EPERM' });
    }

    return unlink(filePath);
  });

  const migrated = await migrateSettings({
    configDir,
    repoRoot: first,
    gatewayOrigin: settings.gatewayOrigin,
    clientId: settings.clientId,
  });

  assert.deepEqual(migrated, settings);
  assert.deepEqual(await loadSettings({ configDir, repoRoot: second }), settings);
  assert.equal(fs.existsSync(legacyPath), true);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /shared enrollment is active/i);
  assert.match(warnings[0], /EPERM/);
  assert.match(warnings[0], /do not.*grip:remove/i);
  assert.doesNotMatch(warnings[0], new RegExp(settings.token));
});
