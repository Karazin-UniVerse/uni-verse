import { cpSync, existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const source = join(root, '.agents', 'skills');
const target = join(root, '.claude', 'skills');
const isCheck = process.argv.includes('--check');

function listFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

// A missing directory is a normal state for the mirror (it counts as empty); read errors propagate.
function listTree(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  return listFiles(directory).map((file) => relative(directory, file));
}

function findDifferences() {
  const sourceFiles = listTree(source);
  const targetFiles = listTree(target);
  const differences = [];

  for (const file of sourceFiles) {
    if (!targetFiles.includes(file)) {
      differences.push(`missing in .claude/skills: ${file}`);
    } else if (!readFileSync(join(source, file)).equals(readFileSync(join(target, file)))) {
      differences.push(`differs: ${file}`);
    }
  }

  for (const file of targetFiles) {
    if (!sourceFiles.includes(file)) {
      differences.push(`extra in .claude/skills: ${file}`);
    }
  }

  return differences;
}

// The canonical directory must exist in both modes: without it there is nothing to mirror or verify.
if (!existsSync(source)) {
  console.error('.agents/skills does not exist; it is the canonical skills directory');
  process.exit(1);
}

try {
  if (isCheck) {
    const differences = findDifferences();

    if (differences.length > 0) {
      console.error(differences.join('\n'));
      console.error('\n.claude/skills is out of sync with .agents/skills. Run: pnpm skills:sync');
      process.exit(1);
    }

    console.info('.claude/skills matches .agents/skills');
  } else {
    // Replace the mirror wholesale so files deleted from .agents/skills disappear from it too.
    rmSync(target, { recursive: true, force: true });
    cpSync(source, target, { recursive: true, verbatimSymlinks: true });
    console.info('Synced .agents/skills -> .claude/skills');
  }
} catch (error) {
  console.error(`skills sync failed: ${error.message}`);
  process.exit(1);
}
