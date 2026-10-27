import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { getSettingsPath, saveSettings } from '../grip/settings.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../grip/cli.mjs');

test('cli hook pre-push exits 0 with notice when not enrolled', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-hook-test-'));

  try {
    const result = spawnSync(
      process.execPath,
      [cliPath, 'hook', 'pre-push', 'origin', 'https://github.com/repo'],
      {
        cwd: tmpDir,
        env: {
          ...process.env,
          CI: '',
          APPDATA: tmpDir,
          XDG_CONFIG_HOME: tmpDir,
        },
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Notice: Grip pre-push check is optional and not enrolled/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('cli hook pre-push exits 0 when CI environment is set', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-hook-test-'));

  try {
    const result = spawnSync(
      process.execPath,
      [cliPath, 'hook', 'pre-push', 'origin', 'https://github.com/repo'],
      {
        cwd: tmpDir,
        env: {
          ...process.env,
          CI: 'true',
          APPDATA: tmpDir,
          XDG_CONFIG_HOME: tmpDir,
        },
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /CI environment detected\. Skipping/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('cli hook pre-push does not skip when CI is false and enrollment has expired', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-hook-ci-false-'));
  const configDir = path.join(tmpDir, 'universe-grip');

  try {
    await saveSettings(
      {
        version: 1,
        repoRoot: tmpDir,
        gatewayOrigin: 'https://gateway.example.com',
        clientId: 'mock-client',
        token: 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
        expiresAt: new Date(Date.now() - 5000).toISOString(),
        executable: process.execPath,
      },
      { configDir },
    );

    const result = spawnSync(
      process.execPath,
      [cliPath, 'hook', 'pre-push', 'origin', 'https://github.com/repo'],
      {
        cwd: tmpDir,
        env: {
          ...process.env,
          CI: 'false',
          APPDATA: tmpDir,
          XDG_CONFIG_HOME: tmpDir,
        },
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /enrollment has expired/i);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('cli hook pre-push fails with code 1 when repoRoot does not match checkout', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-hook-mismatch-'));
  const configDir = path.join(tmpDir, 'universe-grip');

  try {
    await saveSettings(
      {
        version: 1,
        repoRoot: '/completely/different/checkout/path',
      },
      { configDir, repoRoot: tmpDir },
    );

    const result = spawnSync(
      process.execPath,
      [cliPath, 'hook', 'pre-push', 'origin', 'https://github.com/repo'],
      {
        cwd: tmpDir,
        env: {
          ...process.env,
          CI: '',
          APPDATA: tmpDir,
          XDG_CONFIG_HOME: tmpDir,
        },
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /does not match this checkout/i);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('cli hook pre-push fails with code 1 when settings file is corrupt', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-hook-corrupt-'));
  const configDir = path.join(tmpDir, 'universe-grip');

  try {
    fs.mkdirSync(configDir, { recursive: true });
    const settingsPath = getSettingsPath({ configDir, repoRoot: tmpDir });

    fs.writeFileSync(settingsPath, '{ corrupt json');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'hook', 'pre-push', 'origin', 'https://github.com/repo'],
      {
        cwd: tmpDir,
        env: {
          ...process.env,
          CI: '',
          APPDATA: tmpDir,
          XDG_CONFIG_HOME: tmpDir,
        },
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /corrupt or unreadable/i);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('cli hook pre-push fails with code 1 when enrollment has expired', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-hook-expired-'));
  const configDir = path.join(tmpDir, 'universe-grip');

  try {
    await saveSettings(
      {
        version: 1,
        repoRoot: tmpDir,
        gatewayOrigin: 'https://gateway.example.com',
        clientId: 'mock-client',
        token: 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
        expiresAt: new Date(Date.now() - 5000).toISOString(),
        executable: process.execPath,
      },
      { configDir },
    );

    const result = spawnSync(
      process.execPath,
      [cliPath, 'hook', 'pre-push', 'origin', 'https://github.com/repo'],
      {
        cwd: tmpDir,
        env: {
          ...process.env,
          CI: '',
          APPDATA: tmpDir,
          XDG_CONFIG_HOME: tmpDir,
        },
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /enrollment has expired/i);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('cli hook pre-push forwards args and exit code to grip executable when enrolled', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-hook-test-'));
  const configDir = path.join(tmpDir, 'universe-grip');

  try {
    // Cross-platform mock: node executes a local hook script matching the first argument
    const mockHookScript = path.join(tmpDir, 'hook');

    fs.writeFileSync(
      mockHookScript,
      'console.log("MOCK GRIP RUN with args: " + process.argv.slice(1).join(" ")); process.exit(42);\n',
    );

    await saveSettings(
      {
        version: 1,
        repoRoot: tmpDir,
        gatewayOrigin: 'https://gateway.example.com',
        clientId: 'mock-client',
        token: 'ugr_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        executable: process.execPath,
      },
      { configDir },
    );

    const result = spawnSync(
      process.execPath,
      [cliPath, 'hook', 'pre-push', 'origin', 'https://github.com/repo'],
      {
        cwd: tmpDir,
        env: {
          ...process.env,
          CI: '',
          APPDATA: tmpDir,
          XDG_CONFIG_HOME: tmpDir,
        },
        encoding: 'utf8',
      },
    );

    // Mirrors child exit code 42
    assert.equal(result.status, 42);
    assert.match(
      result.stdout,
      /MOCK GRIP RUN with args: .*hook pre-push origin https:\/\/github\.com\/repo/,
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('git push succeeds through Husky when unenrolled', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-git-test-'));

  try {
    const remoteDir = path.join(tmpDir, 'remote.git');
    const localDir = path.join(tmpDir, 'local');

    // 1. Create bare remote
    spawnSync('git', ['init', '-b', 'main', '--bare', remoteDir], { encoding: 'utf8' });

    // 2. Create local repo
    spawnSync('git', ['init', '-b', 'main', localDir], { encoding: 'utf8' });
    spawnSync('git', ['-C', localDir, 'config', 'user.name', 'Test User'], { encoding: 'utf8' });
    spawnSync('git', ['-C', localDir, 'config', 'user.email', 'test@example.com'], {
      encoding: 'utf8',
    });

    // Setup .husky/pre-push pointing to cli.mjs
    const huskyDir = path.join(localDir, '.husky');

    fs.mkdirSync(huskyDir, { recursive: true });
    // Copy the husky runner helper
    fs.cpSync('.husky/_', path.join(huskyDir, '_'), { recursive: true });

    const prePushHook = path.join(huskyDir, 'pre-push');
    const cliPosixPath = cliPath.replace(/\\/g, '/');

    fs.writeFileSync(prePushHook, `node "${cliPosixPath}" hook pre-push "$@"\n`);

    // Configure core.hooksPath
    spawnSync('git', ['-C', localDir, 'config', 'core.hooksPath', '.husky/_'], {
      encoding: 'utf8',
    });

    // Commit file without running pre-commit linter
    fs.writeFileSync(path.join(localDir, 'test.txt'), 'hello');
    spawnSync('git', ['-C', localDir, 'add', '.'], { encoding: 'utf8' });
    spawnSync('git', ['-C', localDir, 'commit', '-m', 'initial commit', '--no-verify'], {
      encoding: 'utf8',
    });

    // Add remote
    spawnSync('git', ['-C', localDir, 'remote', 'add', 'origin', remoteDir], { encoding: 'utf8' });

    // Push
    const pushResult = spawnSync('git', ['-C', localDir, 'push', 'origin', 'main'], {
      env: {
        ...process.env,
        CI: '',
        APPDATA: tmpDir,
        XDG_CONFIG_HOME: tmpDir,
      },
      encoding: 'utf8',
    });

    assert.equal(pushResult.status, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
