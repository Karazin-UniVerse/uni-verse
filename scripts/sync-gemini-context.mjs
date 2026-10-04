import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const manifestPath = join(root, 'CLAUDE.md');
const outputPath = join(root, 'GEMINI.md');
const MAX_BYTES = 24000;
const isCheck = process.argv.includes('--check');

function normalize(text) {
  return text.replaceAll('\r\n', '\n');
}

function readImports() {
  return normalize(readFileSync(manifestPath, 'utf8'))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^@docs\/ai\/.+\.md$/.test(line))
    .map((line) => line.slice(1));
}

function build() {
  const imports = readImports();

  if (imports.length === 0) {
    throw new Error('CLAUDE.md has no @docs/ai/*.md imports to build GEMINI.md from');
  }

  const sections = imports.map((file) => normalize(readFileSync(join(root, file), 'utf8')).trim());
  const header =
    '<!-- GENERATED FILE, do not edit. Source: the @docs/ai/*.md imports in CLAUDE.md. Regenerate: pnpm gemini:sync -->';

  return `${header}\n\n${sections.join('\n\n---\n\n')}\n`;
}

let expected;

try {
  expected = build();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const size = Buffer.byteLength(expected, 'utf8');

if (size > MAX_BYTES) {
  console.error(
    `GEMINI.md would be ${size} bytes; Antigravity truncates rule files over ${MAX_BYTES}.`,
  );
  console.error('Move the least universal doc out of the @docs/ai imports in CLAUDE.md.');
  process.exit(1);
}

if (isCheck) {
  const current = existsSync(outputPath) ? normalize(readFileSync(outputPath, 'utf8')) : null;

  if (current !== expected) {
    console.error('GEMINI.md is missing or out of date. Run: pnpm gemini:sync');
    process.exit(1);
  }

  console.info(`GEMINI.md is up to date (${size} bytes)`);
} else {
  writeFileSync(outputPath, expected);
  console.info(`Wrote GEMINI.md (${size} bytes)`);
}
