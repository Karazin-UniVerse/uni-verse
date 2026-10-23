const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const graphifyOut = path.join(projectRoot, 'graphify-out');
const graphJson = path.join(graphifyOut, 'graph.json');

function findGraphifyExecutable() {
  const localVenvWin = path.join(projectRoot, '.venv', 'Scripts', 'graphify.exe');

  if (fs.existsSync(localVenvWin)) {
    return localVenvWin;
  }

  const localVenvPosix = path.join(projectRoot, '.venv', 'bin', 'graphify');

  if (fs.existsSync(localVenvPosix)) {
    return localVenvPosix;
  }

  return 'graphify';
}

function buildSafeEnv() {
  const safeEnv = { ...process.env, GRAPHIFY_QUERY_LOG_DISABLE: '1' };

  delete safeEnv.OPENAI_API_KEY;
  delete safeEnv.ANTHROPIC_API_KEY;
  delete safeEnv.GEMINI_API_KEY;
  delete safeEnv.GOOGLE_API_KEY;
  delete safeEnv.DEEPSEEK_API_KEY;
  delete safeEnv.MOONSHOT_API_KEY;

  return safeEnv;
}

function spawnGraphifyStep(bin, args, safeEnv) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(bin, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      windowsVerbatimArguments: false,
      env: safeEnv,
    });

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        console.error('Graphify executable not found.');
        console.error(
          'Please install it with: uv tool install graphifyy (or pip install graphifyy)',
        );
        console.error('See docs/graphify.md for setup instructions.');
      } else {
        console.error('Graphify execution failed:', err.message);
      }

      reject(new Error('SPAWN_ERROR'));
    });

    child.on('close', (code, signal) => {
      if (signal) {
        const signalNumber = os.constants.signals[signal];

        resolve(signalNumber ? 128 + signalNumber : 1);

        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function runGraphify(subcommand, extraArgs = []) {
  const bin = findGraphifyExecutable();
  const safeEnv = buildSafeEnv();

  if (subcommand === 'extract') {
    const extractCode = await spawnGraphifyStep(
      bin,
      ['extract', '.', '--code-only', ...extraArgs],
      safeEnv,
    );

    if (extractCode !== 0) {
      process.exit(extractCode);
    }

    if (!extraArgs.includes('--no-cluster')) {
      const clusterCode = await spawnGraphifyStep(
        bin,
        ['cluster-only', '.', '--no-label'],
        safeEnv,
      );

      process.exit(clusterCode);
    }

    process.exit(0);
  }

  let finalArgs = [];

  if (subcommand === 'query') {
    if (!fs.existsSync(graphJson)) {
      console.error(
        'Error: graphify-out/graph.json does not exist. Run "pnpm graphify:extract" first.',
      );
      process.exit(1);
    }

    finalArgs = ['query', ...extraArgs];
  } else if (subcommand === 'explain' || subcommand === 'path' || subcommand === 'god-nodes') {
    if (!fs.existsSync(graphJson)) {
      console.error(
        'Error: graphify-out/graph.json does not exist. Run "pnpm graphify:extract" first.',
      );
      process.exit(1);
    }

    finalArgs = [subcommand, ...extraArgs];
  } else {
    finalArgs = [subcommand, ...extraArgs];
  }

  const exitCode = await spawnGraphifyStep(bin, finalArgs, safeEnv);

  process.exit(exitCode);
}

const args = process.argv.slice(2);
const action = args[0] || 'extract';

runGraphify(action, args.slice(1)).catch(() => {
  process.exit(1);
});
