const { spawnSync } = require('child_process');
const path = require('path');

const files = process.argv.slice(2);

if (files.length === 0) {
  process.exit(0);
}

let oxlintCli;

try {
  const oxlintPkgDir = path.dirname(require.resolve('oxlint/package.json'));

  oxlintCli = path.join(oxlintPkgDir, 'dist/cli.js');
} catch {
  oxlintCli = path.resolve(__dirname, '../../node_modules/oxlint/dist/cli.js');
}

// Run oxlint with auto-fix and strict warning checks scoped to staged files.
const result = spawnSync(process.execPath, [oxlintCli, '--fix', '--deny-warnings', ...files], {
  stdio: 'inherit',
});

process.exit(result.status ?? 0);
