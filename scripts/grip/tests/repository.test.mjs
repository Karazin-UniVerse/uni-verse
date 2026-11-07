import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { test } from 'node:test';
import { validateRepository } from '../settings.mjs';

const repository = 'Karazin-UniVerse/uni-verse.git';
const sshConfig = 'hostname github.com\nuser git\nport 22\n';

function mockCommands(context, { origin, sshResult = { status: 0, stdout: sshConfig } }) {
  return context.mock.method(childProcess, 'spawnSync', (command, args, options) => {
    assert.equal(options.shell ?? false, false);

    if (command === 'git') {
      assert.deepEqual(args, ['remote', 'get-url', 'origin']);

      return { status: 0, stdout: `${origin}\n` };
    }

    assert.equal(command, 'ssh');
    assert.equal(args[0], '-G');
    assert.match(args.at(-1), /^git@[a-z0-9][a-z0-9.-]*$/i);
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
  ]) {
    const commands = mockCommands(context, { origin });

    assert.doesNotThrow(() => validateRepository());
    assert.equal(commands.mock.callCount(), 1);
    commands.mock.restore();
  }
});

test('aliases fail closed on a foreign host, user, port, malformed output or SSH failure', (context) => {
  for (const sshResult of [
    { status: 0, stdout: 'hostname github.com.evil.example\nuser git\nport 22\n' },
    { status: 0, stdout: 'hostname example.com\nuser git\nport 22\n' },
    { status: 0, stdout: 'hostname github.com\nuser other\nport 22\n' },
    { status: 0, stdout: 'hostname github.com\nuser git\nport 2222\n' },
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
    `ssh://git@personal:2222/${repository}`,
    `git@-oProxyCommand=bad:${repository}`,
    `git@personal\n-oProxyCommand=bad:${repository}`,
    `git@personal:${repository}/extra`,
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
