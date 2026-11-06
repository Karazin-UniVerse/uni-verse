import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GRIP_HOSTED_POLICY } from '../../core/constants/grip-hosted.ts';
import { GRIP_REPOSITORY, validateRepository } from './settings.mjs';

const MAX_GIT_BYTES = 8 * 1024 * 1024;
const GIT_TIMEOUT_MS = 30_000;
const ZERO_OID = /^0+$/;
const OID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;

function git(repoRoot, args, signal) {
  signal?.throwIfAborted();
  const result = spawnSync('git', ['-C', repoRoot, ...args], {
    encoding: 'utf8',
    maxBuffer: MAX_GIT_BYTES,
    timeout: GIT_TIMEOUT_MS,
    env: { ...process.env, GIT_EXTERNAL_DIFF: '', GIT_DIFF_OPTS: '' },
  });

  signal?.throwIfAborted();

  if (result.error || result.status !== 0) {
    throw new Error(
      'Git push manifest could not resolve the requested objects or diff. Fetch the destination baseline and retry explicitly.',
    );
  }

  return result.stdout;
}

function parseUpdates(repoRoot, stdin, signal) {
  const lines = stdin.trim() ? stdin.trim().split(/\r?\n/) : [];

  if (lines.length > GRIP_HOSTED_POLICY.MAX_UPDATES) {
    throw new Error('Push manifest exceeds the ref update limit.');
  }

  const updates = lines.map((line) => {
    const fields = line.split(' ');

    if (fields.length !== 4) {
      throw new Error('Invalid pre-push stdin update record.');
    }

    const [localRef, localOid, remoteRef, remoteOid] = fields;

    if (!OID.test(localOid) || !OID.test(remoteOid) || localOid.length !== remoteOid.length) {
      throw new Error('Invalid object ID in push manifest.');
    }

    git(repoRoot, ['check-ref-format', remoteRef], signal);

    if (!ZERO_OID.test(localOid)) {
      if (localRef !== 'HEAD' && !OID.test(localRef)) {
        git(repoRoot, ['check-ref-format', localRef], signal);
      }

      git(repoRoot, ['cat-file', '-e', `${localOid}^{commit}`], signal);
    }

    return { localRef, localOid, remoteRef, remoteOid };
  });

  const destinations = new Set(updates.map((update) => update.remoteRef));

  if (destinations.size !== updates.length) {
    throw new Error('Duplicate destination ref in push manifest.');
  }

  return updates.sort((left, right) =>
    left.remoteRef < right.remoteRef ? -1 : left.remoteRef > right.remoteRef ? 1 : 0,
  );
}

function exclusionPatterns(repoRoot) {
  const config = fs.readFileSync(path.join(repoRoot, '.grip.toml'), 'utf8');
  const block = /\bexclude\s*=\s*\[([^\]]*)\]/s.exec(config)?.[1];

  if (block === undefined) {
    throw new Error('Grip diff exclusion policy is missing.');
  }

  return [...block.matchAll(/"([^"\r\n]+)"/g)].map((match) => match[1]);
}

function isExcluded(file, patterns) {
  const segments = file.split('/');

  return patterns.some((pattern) => {
    if (!pattern.includes('/')) {
      return segments.some((segment) => path.posix.matchesGlob(segment, pattern));
    }

    const recursive = pattern.endsWith('/*') ? `${pattern.slice(0, -1)}**` : pattern;

    return path.posix.matchesGlob(file, recursive);
  });
}

function comparisonBase(repoRoot, update, signal) {
  if (!ZERO_OID.test(update.remoteOid)) {
    return update.remoteOid;
  }

  let defaultRef;

  try {
    defaultRef = git(repoRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD'], signal).trim();
  } catch {
    throw new Error(
      'Destination default branch baseline is missing. Fetch it and configure origin/HEAD before retrying.',
    );
  }

  if (!defaultRef.startsWith('refs/remotes/origin/')) {
    throw new Error('Invalid destination default branch baseline.');
  }

  return git(repoRoot, ['merge-base', update.localOid, defaultRef], signal).trim();
}

function utf8Prefix(text, budget) {
  const bytes = Buffer.from(text, 'utf8');

  if (bytes.length <= budget) {
    return text;
  }

  let end = budget;

  while (end > 0 && (bytes[end] & 0xc0) === 0x80) {
    end -= 1;
  }

  return bytes.subarray(0, end).toString('utf8');
}

export async function collectPushManifest({ repoRoot, remoteUrl, stdin, signal }) {
  validateRepository({ repoRoot, remoteUrl });
  const patterns = exclusionPatterns(repoRoot);
  const updates = parseUpdates(repoRoot, stdin, signal);
  const diffArgs = ['diff', '--no-ext-diff', '--no-textconv', '--no-renames'];
  let diff = '';
  let truncated = false;
  const files = new Set();

  for (const update of updates) {
    if (ZERO_OID.test(update.localOid)) {
      continue;
    }

    const base = comparisonBase(repoRoot, update, signal);
    const renameRecords = git(
      repoRoot,
      [
        'diff',
        '--no-ext-diff',
        '--no-textconv',
        '--name-status',
        '-z',
        '--find-renames',
        base,
        update.localOid,
        '--',
      ],
      signal,
    ).split('\0');

    for (let index = 0; index < renameRecords.length && renameRecords[index];) {
      const status = renameRecords[index++];
      const source = renameRecords[index++];

      if (status.startsWith('R') || status.startsWith('C')) {
        const destination = renameRecords[index++];

        if (isExcluded(source, patterns) !== isExcluded(destination, patterns)) {
          throw new Error(
            'Excluded path rename crosses the review boundary; remove sensitive content before pushing.',
          );
        }
      }
    }

    const changedPaths = git(
      repoRoot,
      [...diffArgs, '--name-only', '-z', base, update.localOid, '--'],
      signal,
    )
      .split('\0')
      .filter(Boolean)
      .sort();

    for (const file of changedPaths) {
      if (isExcluded(file, patterns)) {
        continue;
      }

      if (!files.has(file) && files.size >= GRIP_HOSTED_POLICY.MAX_FILES) {
        throw new Error('Push manifest exceeds the represented file limit.');
      }

      const remaining = GRIP_HOSTED_POLICY.MAX_DIFF_BYTES - Buffer.byteLength(diff);
      const header = `\nPush update ${JSON.stringify(update)}\nFile ${JSON.stringify(file)}\n`;

      if (remaining <= Buffer.byteLength(header)) {
        truncated = true;
        continue;
      }

      const patch = git(
        repoRoot,
        [
          ...diffArgs,
          '--no-color',
          '--unified=3',
          base,
          update.localOid,
          '--',
          `:(literal)${file}`,
        ],
        signal,
      );
      const section = header + patch;

      diff += utf8Prefix(section, remaining);
      files.add(file);
      truncated ||= Buffer.byteLength(section) > remaining;
    }
  }

  if (!diff) {
    return { kind: 'noContent', reason: 'NO_REVIEWABLE_CONTENT' };
  }

  return {
    kind: 'review',
    manifest: {
      repository: GRIP_REPOSITORY,
      updates,
      policyVersion: GRIP_HOSTED_POLICY.VERSION,
      diffDigest: createHash('sha256').update(diff, 'utf8').digest('hex'),
    },
    diff,
    files: [...files].sort(),
    truncated,
  };
}
