import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  copyFileSync,
  chmodSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

function createMirror(context) {
  const root = mkdtempSync(join(tmpdir(), 'universe-skills-'));

  context.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  const script = join(root, 'scripts/sync-skills.mjs');
  const source = join(root, '.agents/skills');
  const target = join(root, '.claude/skills');

  copyFileSync(new URL('../sync-skills.mjs', import.meta.url), script);
  mkdirSync(source, { recursive: true });
  mkdirSync(target, { recursive: true });
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

  return { root, script, source, target, run };
}

test('sync preserves unchanged files and directories while updating the mirror', (context) => {
  const { root, source, target, run } = createMirror(context);
  const external = join(root, 'external.md');

  mkdirSync(join(source, 'kept'), { recursive: true });
  mkdirSync(join(target, 'kept'), { recursive: true });
  mkdirSync(join(target, 'obsolete'), { recursive: true });
  writeFileSync(join(source, 'kept/SKILL.md'), 'unchanged');
  writeFileSync(join(target, 'kept/SKILL.md'), 'unchanged');
  writeFileSync(join(source, 'updated.md'), 'new');
  writeFileSync(join(target, 'updated.md'), 'old');
  writeFileSync(join(source, 'added.md'), 'added');
  writeFileSync(join(target, 'obsolete/SKILL.md'), 'removed');
  writeFileSync(join(source, 'Canonical.md'), 'new spelling');
  writeFileSync(join(target, 'canonical.md'), 'old spelling');
  writeFileSync(external, 'outside the mirror');
  writeFileSync(join(source, 'hardlink.md'), 'new mirror contents');
  linkSync(external, join(target, 'hardlink.md'));
  mkdirSync(join(source, 'was-file'));
  writeFileSync(join(source, 'was-file/SKILL.md'), 'directory now');
  writeFileSync(join(target, 'was-file'), 'file before');
  writeFileSync(join(source, 'was-directory'), 'file now');
  mkdirSync(join(target, 'was-directory'));
  writeFileSync(join(target, 'was-directory/SKILL.md'), 'directory before');
  utimesSync(join(target, 'kept/SKILL.md'), 1000000000, 1000000000);
  const modified = statSync(join(target, 'kept/SKILL.md')).mtimeMs;
  const directory = statSync(target).ino;

  assert.equal(run('--check').status, 1);
  const synced = run();

  assert.equal(synced.status, 0, synced.stderr);
  assert.equal(statSync(join(target, 'kept/SKILL.md')).mtimeMs, modified);
  assert.equal(statSync(target).ino, directory);
  assert.equal(readFileSync(join(target, 'updated.md'), 'utf8'), 'new');
  assert.equal(readFileSync(join(target, 'added.md'), 'utf8'), 'added');
  assert.equal(existsSync(join(target, 'obsolete')), false);
  assert.equal(readFileSync(join(target, 'Canonical.md'), 'utf8'), 'new spelling');
  assert.equal(readFileSync(join(target, 'hardlink.md'), 'utf8'), 'new mirror contents');
  assert.equal(readFileSync(external, 'utf8'), 'outside the mirror');
  assert.equal(readFileSync(join(target, 'was-file/SKILL.md'), 'utf8'), 'directory now');
  assert.equal(readFileSync(join(target, 'was-directory'), 'utf8'), 'file now');
  assert.equal(run().status, 0);
  assert.equal(statSync(join(target, 'kept/SKILL.md')).mtimeMs, modified);
  assert.equal(run('--check').status, 0);
});

if (process.platform !== 'win32') {
  test('sync and check compare executable bits and symlink targets on POSIX', (context) => {
    const { source, target, run } = createMirror(context);

    for (const directory of [source, target]) {
      writeFileSync(join(directory, 'first'), 'same');
      writeFileSync(join(directory, 'second'), 'same');
    }

    chmodSync(join(source, 'first'), 0o755);
    chmodSync(join(target, 'first'), 0o644);
    assert.equal(run('--check').status, 1);
    assert.equal(run().status, 0);
    assert.equal(statSync(join(target, 'first')).mode & 0o111, 0o111);

    symlinkSync('first', join(source, 'link'));
    symlinkSync('second', join(target, 'link'));
    assert.equal(run('--check').status, 1);
    assert.equal(run().status, 0);
    assert.equal(readlinkSync(join(target, 'link')), 'first');

    rmSync(join(source, 'link'));
    symlinkSync('missing', join(source, 'link'));
    assert.equal(run().status, 0);
    assert.equal(readlinkSync(join(target, 'link')), 'missing');
    assert.equal(run('--check').status, 0);

    rmSync(join(source, 'link'));
    writeFileSync(join(source, 'link'), 'regular file');
    assert.equal(run().status, 0);
    assert.equal(readFileSync(join(target, 'link'), 'utf8'), 'regular file');
    assert.equal(run('--check').status, 0);
  });
}

if (process.platform === 'win32') {
  test('sync retries a Windows sharing lock before removing an obsolete file', async (context) => {
    const { root, script, target } = createMirror(context);
    const lockedFile = join(target, 'obsolete.md');
    const releaseFile = join(root, 'release-lock');
    const releasedFile = join(root, 'lock-released');
    const preload = join(root, 'release-on-retry.mjs');

    writeFileSync(lockedFile, 'obsolete');
    // Where sync would sleep before retrying, release the real Windows lock and
    // wait for confirmation, independent of process startup or scheduling speed.
    writeFileSync(
      preload,
      `import { existsSync, writeFileSync } from 'node:fs';
const wait = Atomics.wait;
const releaseFile = ${JSON.stringify(releaseFile)};
const releasedFile = ${JSON.stringify(releasedFile)};
Atomics.wait = (buffer, index, value) => {
  writeFileSync(releaseFile, '');
  const deadline = Date.now() + 5000;
  while (!existsSync(releasedFile)) {
    if (Date.now() >= deadline) throw new Error('Windows lock release timed out');
    wait(buffer, index, value, 20);
  }
  return 'timed-out';
};
`,
    );
    const locker = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '$file = [IO.File]::Open($env:SKILLS_TEST_LOCK, "Open", "Read", "Read"); ' +
          'try { [Console]::WriteLine("ready"); ' +
          'while (-not [IO.File]::Exists($env:SKILLS_TEST_RELEASE)) { Start-Sleep -Milliseconds 20 } } ' +
          'finally { $file.Dispose() }; [IO.File]::WriteAllText($env:SKILLS_TEST_RELEASED, "")',
      ],
      {
        env: {
          ...process.env,
          SKILLS_TEST_LOCK: lockedFile,
          SKILLS_TEST_RELEASE: releaseFile,
          SKILLS_TEST_RELEASED: releasedFile,
        },
        windowsHide: true,
      },
    );
    const finished = once(locker, 'close');

    try {
      await Promise.race([
        once(locker.stdout, 'data', { signal: AbortSignal.timeout(10_000) }),
        finished.then(() => assert.fail('The lock holder exited before opening the test file')),
      ]);
      const result = spawnSync(
        process.execPath,
        ['--import', pathToFileURL(preload).href, script],
        {
          encoding: 'utf8',
          timeout: 10_000,
        },
      );

      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        existsSync(releasedFile),
        true,
        'The sync must retry after encountering the lock',
      );
      assert.equal(existsSync(lockedFile), false);
      const [status] = await finished;

      assert.equal(status, 0);
    } finally {
      locker.kill();
      await finished;
    }
  });
}
