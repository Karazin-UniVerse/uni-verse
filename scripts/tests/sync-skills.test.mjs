import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('sync preserves unchanged files and directories while updating the mirror', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'universe-skills-'));

  context.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  copyFileSync(
    new URL('../sync-skills.mjs', import.meta.url),
    join(root, 'scripts/sync-skills.mjs'),
  );
  const source = join(root, '.agents/skills');
  const target = join(root, '.claude/skills');

  mkdirSync(join(source, 'kept'), { recursive: true });
  mkdirSync(join(target, 'kept'), { recursive: true });
  mkdirSync(join(target, 'obsolete'), { recursive: true });
  writeFileSync(join(source, 'kept/SKILL.md'), 'unchanged');
  writeFileSync(join(target, 'kept/SKILL.md'), 'unchanged');
  writeFileSync(join(source, 'updated.md'), 'new');
  writeFileSync(join(target, 'updated.md'), 'old');
  writeFileSync(join(source, 'added.md'), 'added');
  writeFileSync(join(target, 'obsolete/SKILL.md'), 'removed');
  mkdirSync(join(source, 'was-file'));
  writeFileSync(join(source, 'was-file/SKILL.md'), 'directory now');
  writeFileSync(join(target, 'was-file'), 'file before');
  writeFileSync(join(source, 'was-directory'), 'file now');
  mkdirSync(join(target, 'was-directory'));
  writeFileSync(join(target, 'was-directory/SKILL.md'), 'directory before');
  utimesSync(join(target, 'kept/SKILL.md'), 1000000000, 1000000000);
  const modified = statSync(join(target, 'kept/SKILL.md')).mtimeMs;
  const directory = statSync(target).ino;
  const run = (...args) =>
    spawnSync(process.execPath, [join(root, 'scripts/sync-skills.mjs'), ...args], {
      encoding: 'utf8',
    });

  assert.equal(run('--check').status, 1);
  const synced = run();

  assert.equal(synced.status, 0, synced.stderr);
  assert.equal(statSync(join(target, 'kept/SKILL.md')).mtimeMs, modified);
  assert.equal(statSync(target).ino, directory);
  assert.equal(readFileSync(join(target, 'updated.md'), 'utf8'), 'new');
  assert.equal(readFileSync(join(target, 'added.md'), 'utf8'), 'added');
  assert.equal(existsSync(join(target, 'obsolete')), false);
  assert.equal(readFileSync(join(target, 'was-file/SKILL.md'), 'utf8'), 'directory now');
  assert.equal(readFileSync(join(target, 'was-directory'), 'utf8'), 'file now');
  assert.equal(run().status, 0);
  assert.equal(statSync(join(target, 'kept/SKILL.md')).mtimeMs, modified);
  assert.equal(run('--check').status, 0);
});
