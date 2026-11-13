import {
  chmodSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const source = join(root, '.agents', 'skills');
const target = join(root, '.claude', 'skills');
const isCheck = process.argv.includes('--check');
const differences = [];
const EXECUTABLE_BITS = 0o111;
const LOCK_RETRIES = 3;
const LOCK_RETRY_DELAY_MS = 100;
const WINDOWS_LOCK_ERRORS = new Set(['EBUSY', 'EPERM', 'ENOTEMPTY', 'EACCES']);
const lockWait = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));

function lstatIfPresent(entryPath) {
  try {
    return lstatSync(entryPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function entryKind(entry) {
  if (entry?.isDirectory()) return 'directory';

  if (entry?.isSymbolicLink()) return 'symlink';

  if (entry?.isFile()) return 'file';
}

function writeMirror(operation) {
  for (let attempt = 0; ; attempt++) {
    try {
      operation();

      return;
    } catch (error) {
      if (
        process.platform !== 'win32' ||
        attempt >= LOCK_RETRIES ||
        !WINDOWS_LOCK_ERRORS.has(error.code)
      ) {
        throw error;
      }

      Atomics.wait(lockWait, 0, 0, LOCK_RETRY_DELAY_MS * (attempt + 1));
    }
  }
}

function removeMirrorEntry(entryPath) {
  const entry = relative(target, entryPath);

  if (!entry || entry === '..' || entry.startsWith('..' + sep) || isAbsolute(entry)) {
    throw new Error('Refusing to remove an entry outside the skills mirror');
  }

  writeMirror(() => rmSync(entryPath, { recursive: true, force: true }));
}

function reconcileDirectory(sourceDirectory, targetDirectory) {
  const sourceNames = new Set(readdirSync(sourceDirectory));

  // Remove obsolete spellings first so case-only renames work on Windows.
  for (const name of readdirSync(targetDirectory)) {
    if (!sourceNames.has(name)) {
      const targetPath = join(targetDirectory, name);

      if (isCheck) {
        differences.push('extra in .claude/skills: ' + relative(target, targetPath));
      } else {
        removeMirrorEntry(targetPath);
      }
    }
  }

  for (const name of sourceNames) {
    reconcileEntry(join(sourceDirectory, name), join(targetDirectory, name));
  }
}

function reconcileEntry(sourcePath, targetPath) {
  const sourceEntry = lstatSync(sourcePath);
  const targetEntry = lstatIfPresent(targetPath);
  const kind = entryKind(sourceEntry);
  const sameKind = kind === entryKind(targetEntry);
  const name = relative(target, targetPath) || '.';

  if (!kind) {
    throw new Error('Unsupported entry in .agents/skills: ' + name);
  }

  if (!sameKind) {
    if (isCheck) {
      differences.push((targetEntry ? 'differs: ' : 'missing in .claude/skills: ') + name);

      return;
    }

    if (targetEntry) {
      removeMirrorEntry(targetPath);
    }
  }

  if (kind === 'directory') {
    if (!sameKind) {
      writeMirror(() => mkdirSync(targetPath, { recursive: true }));
    }

    reconcileDirectory(sourcePath, targetPath);

    return;
  }

  if (kind === 'symlink') {
    const linkTarget = readlinkSync(sourcePath);

    if (!sameKind || linkTarget !== readlinkSync(targetPath)) {
      if (isCheck) {
        differences.push('differs: ' + name);
      } else {
        if (sameKind) {
          removeMirrorEntry(targetPath);
        }

        const isWindowsDirectoryLink =
          process.platform === 'win32' &&
          statSync(sourcePath, { throwIfNoEntry: false })?.isDirectory();

        writeMirror(() =>
          symlinkSync(linkTarget, targetPath, isWindowsDirectoryLink ? 'dir' : 'file'),
        );
      }
    }

    return;
  }

  const modeChanged =
    process.platform !== 'win32' &&
    sameKind &&
    (sourceEntry.mode & EXECUTABLE_BITS) !== (targetEntry.mode & EXECUTABLE_BITS);
  const contentChanged = !sameKind || !readFileSync(sourcePath).equals(readFileSync(targetPath));

  if (!contentChanged && !modeChanged) {
    return;
  }

  if (isCheck) {
    differences.push('differs: ' + name);

    return;
  }

  const isHardlinked = sameKind && targetEntry.nlink > 1;

  if (isHardlinked) {
    removeMirrorEntry(targetPath);
  }

  if (contentChanged || isHardlinked) {
    writeMirror(() => copyFileSync(sourcePath, targetPath));
  }

  if (modeChanged) {
    writeMirror(() =>
      chmodSync(
        targetPath,
        (targetEntry.mode & ~EXECUTABLE_BITS) | (sourceEntry.mode & EXECUTABLE_BITS),
      ),
    );
  }
}

try {
  if (!lstatIfPresent(dirname(source))?.isDirectory() || !lstatIfPresent(source)?.isDirectory()) {
    throw new Error('.agents/skills must be the canonical skills directory');
  }

  for (const directory of [dirname(target), target]) {
    const entry = lstatIfPresent(directory);

    if (entry && !entry.isDirectory()) {
      throw new Error('Expected a directory for ' + relative(root, directory));
    }
  }

  reconcileEntry(source, target);

  if (differences.length > 0) {
    console.error(differences.join('\n'));
    console.error('\n.claude/skills is out of sync with .agents/skills. Run: pnpm skills:sync');
    process.exitCode = 1;
  } else if (isCheck) {
    console.info('.claude/skills matches .agents/skills');
  } else {
    console.info('Synced .agents/skills -> .claude/skills');
  }
} catch (error) {
  console.error('Skills sync failed: ' + error.message);

  if (!isCheck) {
    console.error('Resolve the reported error, then rerun pnpm skills:sync to finish the mirror.');
  }

  process.exitCode = 1;
}
