import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { collectPushManifest } from '../push-manifest.mjs';

function repository(t, objectFormat = 'sha1') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-manifest-'));
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1' },
    }).trim();

  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git('init', '-b', 'develop', `--object-format=${objectFormat}`);
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.com');
  git('config', 'core.autocrlf', 'false');
  git('config', 'core.hooksPath', path.join(root, 'no-hooks'));
  git('remote', 'add', 'origin', 'https://github.com/Karazin-UniVerse/uni-verse.git');
  fs.copyFileSync(
    new URL('../../../../.grip.toml', import.meta.url),
    path.join(root, '.grip.toml'),
  );
  fs.writeFileSync(path.join(root, 'app.txt'), 'initial\n');
  git('add', '.');
  git('commit', '-m', 'initial');
  const base = git('rev-parse', 'HEAD');

  git('update-ref', 'refs/remotes/origin/develop', base);
  git('symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/develop');

  return { root, git, base };
}

const remoteUrl = 'https://github.com/Karazin-UniVerse/uni-verse.git';

for (const format of ['sha1', 'sha256']) {
  test(`collects the committed push rather than later HEAD (${format}) and excludes secrets`, async (t) => {
    const { root, git, base } = repository(t, format);

    fs.writeFileSync(path.join(root, 'app.txt'), 'review this\n');
    fs.writeFileSync(path.join(root, '.env.private'), 'DO_NOT_UPLOAD_TOKEN');
    fs.mkdirSync(path.join(root, 'nested'));
    fs.writeFileSync(path.join(root, 'nested', 'private.key'), 'DO_NOT_UPLOAD_KEY');
    git('add', '.');
    git('commit', '-m', 'pushed');
    const pushed = git('rev-parse', 'HEAD');

    fs.writeFileSync(path.join(root, 'app.txt'), 'later unpushed content\n');
    git('add', '.');
    git('commit', '-m', 'later');
    const result = await collectPushManifest({
      repoRoot: root,
      remoteUrl,
      stdin: `refs/heads/develop ${pushed} refs/heads/develop ${base}\n`,
    });

    assert.equal(result.kind, 'review');
    assert.deepEqual(result.files, ['app.txt']);
    assert.match(result.diff, /review this/);
    assert.doesNotMatch(result.diff, /DO_NOT_UPLOAD|later unpushed/);
    assert.equal(result.manifest.updates[0].localOid, pushed);
    assert.equal(
      result.manifest.diffDigest,
      createHash('sha256').update(result.diff).digest('hex'),
    );
  });
}

test('uses the configured destination default merge-base for a new branch', async (t) => {
  const { root, git } = repository(t);

  fs.writeFileSync(path.join(root, '-option.txt'), 'new content');
  git('add', '.');
  git('commit', '-m', 'branch');
  const pushed = git('rev-parse', 'HEAD');
  const result = await collectPushManifest({
    repoRoot: root,
    remoteUrl,
    stdin: `refs/heads/feature ${pushed} refs/heads/feature ${'0'.repeat(40)}\n`,
  });

  assert.equal(result.kind, 'review');
  assert.deepEqual(result.files, ['-option.txt']);
  assert.match(result.diff, /new content/);
  git('symbolic-ref', '--delete', 'refs/remotes/origin/HEAD');
  await assert.rejects(
    collectPushManifest({
      repoRoot: root,
      remoteUrl,
      stdin: `refs/heads/feature ${pushed} refs/heads/feature ${'0'.repeat(40)}\n`,
    }),
    /default branch|baseline/i,
  );
});

test('binds all refs but makes deletion-only pushes explicit no-content', async (t) => {
  const { root, base } = repository(t);
  const result = await collectPushManifest({
    repoRoot: root,
    remoteUrl,
    stdin: `(delete) ${'0'.repeat(40)} refs/heads/old ${base}\n`,
  });

  assert.equal(result.kind, 'noContent');
  assert.equal(result.reason, 'NO_REVIEWABLE_CONTENT');
  await assert.rejects(
    collectPushManifest({ repoRoot: root, remoteUrl, stdin: 'broken record' }),
    /update|stdin|manifest/i,
  );
  await assert.rejects(
    collectPushManifest({ repoRoot: root, remoteUrl: 'https://evil.example/repo', stdin: '' }),
    /repository/i,
  );
  await assert.rejects(
    collectPushManifest({
      repoRoot: root,
      remoteUrl,
      stdin: `refs/heads/a ${'f'.repeat(40)} refs/heads/a ${base}\n`,
    }),
    /Git|object/i,
  );
});

test('caps uploaded UTF-8 content without splitting a codepoint', async (t) => {
  const { root, git, base } = repository(t);

  fs.writeFileSync(path.join(root, 'app.txt'), '日本語'.repeat(10_000));
  git('add', '.');
  git('commit', '-m', 'large');
  const pushed = git('rev-parse', 'HEAD');
  const result = await collectPushManifest({
    repoRoot: root,
    remoteUrl,
    stdin: `refs/heads/develop ${pushed} refs/heads/develop ${base}\n`,
  });

  assert.equal(result.truncated, true);
  assert.ok(Buffer.byteLength(result.diff, 'utf8') <= 30_000);
  assert.doesNotMatch(result.diff, /\uFFFD/);
  assert.deepEqual(result.files, ['app.txt']);
});

test('sorts multiple ref updates deterministically and never invokes external diff', async (t) => {
  const { root, git, base } = repository(t);

  git('config', 'diff.external', 'THIS_COMMAND_MUST_NOT_RUN');
  fs.writeFileSync(path.join(root, 'app.txt'), 'changed\n');
  git('add', '.');
  git('commit', '-m', 'update');
  const pushed = git('rev-parse', 'HEAD');
  const lines = [
    `refs/heads/z ${pushed} refs/heads/z ${base}`,
    `refs/heads/a ${pushed} refs/heads/a ${base}`,
  ];
  const first = await collectPushManifest({ repoRoot: root, remoteUrl, stdin: lines.join('\n') });
  const second = await collectPushManifest({
    repoRoot: root,
    remoteUrl,
    stdin: lines.reverse().join('\n'),
  });

  assert.deepEqual(first, second);
  assert.equal(first.manifest.updates.length, 2);
});

test('excludes nested artifact trees and keys while retaining binary metadata only', async (t) => {
  const { root, git, base } = repository(t);

  for (const file of [
    'node_modules/package/deep/file.ts',
    '.next/deep/cache.txt',
    '.claude/skills/deep/SKILL.md',
    'nested/.env',
    'nested/.env.production',
    'nested/secret.pem',
    'nested/secrets.key',
  ]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), 'DO_NOT_UPLOAD_NESTED');
  }

  fs.writeFileSync(path.join(root, 'asset.bin'), Buffer.from([0, 1, 2, 255, 128]));
  fs.writeFileSync(path.join(root, '名字.txt'), 'visible unicode');
  git('add', '.');
  git('commit', '-m', 'mixed');
  const pushed = git('rev-parse', 'HEAD');
  const result = await collectPushManifest({
    repoRoot: root,
    remoteUrl,
    stdin: `refs/heads/a ${pushed} refs/heads/a ${base}\n`,
  });

  assert.deepEqual(result.files, ['asset.bin', '名字.txt']);
  assert.doesNotMatch(result.diff, /DO_NOT_UPLOAD|GIT binary patch/);
  assert.match(result.diff, /Binary files/);
  assert.match(result.diff, /visible unicode/);
});

test('does not mistake missing baseline objects or duplicate updates for an empty push', async (t) => {
  const { root, base } = repository(t);
  const update = `refs/heads/a ${base} refs/heads/a ${'f'.repeat(40)}`;

  await assert.rejects(
    collectPushManifest({ repoRoot: root, remoteUrl, stdin: update }),
    /Git|objects/i,
  );
  await assert.rejects(
    collectPushManifest({ repoRoot: root, remoteUrl, stdin: `${update}\n${update}` }),
    /Duplicate/i,
  );
});

test('does not upload excluded content when a tracked secret is renamed into an allowed path', async (t) => {
  const { root, git, base } = repository(t);

  fs.writeFileSync(path.join(root, '.env.private'), 'FIXTURE_SECRET_MUST_NOT_UPLOAD\n');
  git('add', '.');
  git('commit', '-m', 'add excluded secret');
  const secretCommit = git('rev-parse', 'HEAD');

  git('mv', '.env.private', 'visible.txt');
  git('commit', '-m', 'rename secret');
  const pushed = git('rev-parse', 'HEAD');

  await assert.rejects(
    collectPushManifest({
      repoRoot: root,
      remoteUrl,
      stdin: `refs/heads/a ${pushed} refs/heads/a ${secretCommit}\n`,
    }),
    /excluded.*rename/i,
  );
  assert.notEqual(pushed, base);
});

test('does not upload a tracked allowed path renamed into the excluded tree', async (t) => {
  const { root, git, base } = repository(t);

  git('mv', 'app.txt', '.env.private');
  git('commit', '-m', 'move into excluded path');
  const pushed = git('rev-parse', 'HEAD');

  await assert.rejects(
    collectPushManifest({
      repoRoot: root,
      remoteUrl,
      stdin: `refs/heads/a ${pushed} refs/heads/a ${base}\n`,
    }),
    /excluded.*rename/i,
  );
});
