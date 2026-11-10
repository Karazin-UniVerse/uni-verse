import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { validateRepository } from '../settings.mjs';
import { initializeRepository } from './helpers.mjs';

const repository = 'Karazin-UniVerse/uni-verse.git';
const sshConfig = 'hostname github.com\nuser git\nport 22\n';

function mockCommands(context, { origin, sshResult = { status: 0, stdout: sshConfig } }) {
  return context.mock.method(childProcess, 'spawnSync', (command, args, options) => {
    assert.equal(command, 'git');
    assert.equal(options.shell ?? false, false);

    if (args[0] === 'remote') {
      assert.deepEqual(args, ['remote', 'get-url', 'origin']);

      return { status: 0, stdout: `${origin}\n` };
    }

    assert.equal(args[0], '-c');
    assert.match(args[1], /^alias\.grip-ssh-config=!/);
    assert.equal(args[2], 'grip-ssh-config');
    assert.match(args.at(-1), /^git@[a-z0-9_][a-z0-9._-]*$/i);
    assert.ok(options.timeout > 0);

    return sshResult;
  });
}

test('SSH aliases work for origin and the push destination after resolving to GitHub', (context) => {
  for (const origin of [
    `git@github.com-personal:${repository}`,
    `ssh://git@personal/${repository}`,
  ]) {
    const commands = mockCommands(context, { origin });

    assert.doesNotThrow(() => validateRepository({ remoteUrl: `git@work:${repository}` }));
    assert.equal(commands.mock.callCount(), 3);
    commands.mock.restore();
  }
});

test('canonical HTTPS and SSH remotes do not need SSH installed', (context) => {
  for (const origin of [
    `https://github.com/${repository}`,
    `git@github.com:${repository}`,
    `ssh://git@github.com/${repository}`,
    `ssh://git@ssh.github.com:443/${repository}`,
  ]) {
    const commands = mockCommands(context, { origin });

    assert.doesNotThrow(() => validateRepository());
    assert.equal(commands.mock.callCount(), 1);
    commands.mock.restore();
  }
});

test('resolves an identical SSH origin and push destination once', (context) => {
  const origin = `git@personal:${repository}`;
  const commands = mockCommands(context, {
    origin,
    sshResult: { status: 0, stdout: 'hostname ssh.github.com\nuser git\nport 443\n' },
  });

  assert.doesNotThrow(() => validateRepository({ remoteUrl: origin }));
  assert.equal(commands.mock.callCount(), 2);
});

test('passes an explicit SSH URL port to the config probe', (context) => {
  const commands = mockCommands(context, {
    origin: `ssh://git@personal:443/${repository}`,
    sshResult: { status: 0, stdout: 'hostname ssh.github.com\nuser git\nport 443\n' },
  });

  assert.doesNotThrow(() => validateRepository());
  assert.deepEqual(commands.mock.calls[1].arguments[1].slice(3), ['-p', '443', 'git@personal']);
});

test('resolves an alias through Git’s configured OpenSSH command', (context) => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'grip-ssh-config-'));
  const env = { ...process.env };

  delete env.GIT_SSH_COMMAND;
  context.mock.property(process, 'env', env);
  context.after(() => rmSync(repoRoot, { recursive: true, force: true }));
  initializeRepository(repoRoot, `ssh://git@Grip_Test:443/${repository}`);
  writeFileSync(
    join(repoRoot, 'grip ssh.conf'),
    'Host Grip_Test\n  HostName ssh.github.com\n  User git\n',
  );
  const result = childProcess.spawnSync(
    'git',
    ['config', 'core.sshCommand', 'ssh -F "grip ssh.conf"'],
    { cwd: repoRoot, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotThrow(() => validateRepository({ repoRoot }));

  env.GIT_SSH_COMMAND = '';
  assert.throws(() => validateRepository({ repoRoot }), /restricted/i);
});

test('aliases fail closed on a foreign host, user, port, malformed output or SSH failure', (context) => {
  for (const sshResult of [
    { status: 0, stdout: 'hostname github.com.evil.example\nuser git\nport 22\n' },
    { status: 0, stdout: 'hostname example.com\nuser git\nport 22\n' },
    { status: 0, stdout: 'hostname github.com\nuser other\nport 22\n' },
    { status: 0, stdout: 'hostname github.com\nuser git\nport 2222\n' },
    { status: 0, stdout: 'hostname github.com\nuser git\nport 443\n' },
    { status: 0, stdout: 'hostname ssh.github.com\nuser git\nport 22\n' },
    { status: 0, stdout: 'hostname github.com extra\nuser git\nport 22\n' },
    { status: 0, stdout: 'hostname example.com\n' + sshConfig },
    { status: 0, stdout: '' },
    { status: 1, stdout: sshConfig },
    { status: null, error: new Error('SSH unavailable or timed out') },
  ]) {
    const commands = mockCommands(context, { origin: `git@personal:${repository}`, sshResult });

    assert.throws(() => validateRepository(), /restricted/i);
    commands.mock.restore();
  }
});

test('aliases never permit foreign repositories, credentials, options or malformed destinations', (context) => {
  for (const destination of [
    'git@personal:another/project.git',
    `https://personal/${repository}`,
    `https://user:secret@github.com/${repository}`,
    `ssh://other@personal/${repository}`,
    `GIT@personal:${repository}`,
    `ssh://GIT@personal/${repository}`,
    `GIT@github.com:${repository}`,
    `ssh://GIT@github.com/${repository}`,
    `ssh://GIT@ssh.github.com:443/${repository}`,
    `ssh://git@personal:2222/${repository}`,
    `git@-oProxyCommand=bad:${repository}`,
    `git@personal\n-oProxyCommand=bad:${repository}`,
    `git@personal:${repository}/extra`,
    `git@personal:${repository}\n`,
  ]) {
    const commands = mockCommands(context, { origin: `https://github.com/${repository}` });

    assert.throws(() => validateRepository({ remoteUrl: destination }), /restricted/i);
    assert.equal(commands.mock.callCount(), 1);
    commands.mock.restore();
  }
});

test('a valid origin cannot authorize a push alias resolving outside GitHub', (context) => {
  mockCommands(context, {
    origin: `https://github.com/${repository}`,
    sshResult: { status: 0, stdout: 'hostname example.com\nuser git\nport 22\n' },
  });

  assert.throws(
    () => validateRepository({ remoteUrl: `git@personal:${repository}` }),
    /restricted/i,
  );
});
