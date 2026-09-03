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

// Run oxlint with auto-fix enabled across staged files.
// Output warnings/errors to stdout/stderr so the developer is aware,
// but exit with code 0 so the commit state remains available (non-blocking).
spawnSync(process.execPath, [oxlintCli, '--fix', ...files], {
  stdio: 'inherit',
});

process.exit(0);
