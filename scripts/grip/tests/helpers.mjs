import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

export function initializeRepository(
  directory,
  remote = 'https://github.com/Karazin-UniVerse/uni-verse.git',
) {
  for (const args of [
    ['init', '-b', 'main', directory],
    ['-C', directory, 'remote', 'add', 'origin', remote],
  ]) {
    const result = spawnSync('git', args, { encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
  }
}
