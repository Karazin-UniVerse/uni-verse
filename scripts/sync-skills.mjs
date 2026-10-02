import { cpSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
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

function safeList(directory) {
  try {
    statSync(directory);

    return listFiles(directory).map((file) => relative(directory, file));
  } catch {
    return [];
  }
}

function findDifferences() {
  const sourceFiles = safeList(source);
  const targetFiles = safeList(target);
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

if (isCheck) {
  const differences = findDifferences();

  if (differences.length > 0) {
    console.error(differences.join('\n'));
    console.error('\n.claude/skills is out of sync with .agents/skills. Run: pnpm skills:sync');
    process.exit(1);
  }

  console.log('.claude/skills matches .agents/skills');
} else {
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  console.log('Synced .agents/skills -> .claude/skills');
}
