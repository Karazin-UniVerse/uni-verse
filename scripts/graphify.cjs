const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const graphifyOut = path.join(projectRoot, 'graphify-out');
const graphJson = path.join(graphifyOut, 'graph.json');

function findGraphifyExecutable() {
  const tempVenvWin =
    'C:\\Users\\Rodion Barsukov\\AppData\\Local\\Temp\\opencode\\graphify-rs205\\Scripts\\graphify.exe';

  if (fs.existsSync(tempVenvWin)) {
    return tempVenvWin;
  }

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

function runGraphify(subcommand, extraArgs = []) {
  const bin = findGraphifyExecutable();
  let finalArgs = [];

  if (subcommand === 'extract') {
    finalArgs = ['extract', '.', '--code-only', '--no-cluster', ...extraArgs];
  } else if (subcommand === 'query') {
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

  // Clear any potential API keys from the child environment to guarantee 0 token spend
  const safeEnv = { ...process.env, GRAPHIFY_QUERY_LOG_DISABLE: '1' };

  delete safeEnv.OPENAI_API_KEY;
  delete safeEnv.ANTHROPIC_API_KEY;
  delete safeEnv.GEMINI_API_KEY;
  delete safeEnv.GOOGLE_API_KEY;
  delete safeEnv.DEEPSEEK_API_KEY;
  delete safeEnv.MOONSHOT_API_KEY;

  const child = childProcess.spawn(bin, finalArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsVerbatimArguments: false,
    env: safeEnv,
  });

  child.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error('Graphify executable not found.');
      console.error('Please install it with: uv tool install graphifyy (or pip install graphifyy)');
      console.error('See docs/graphify.md for setup instructions.');
    } else {
      console.error('Graphify execution failed:', err.message);
    }

    process.exit(1);
  });

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

const args = process.argv.slice(2);
const action = args[0] || 'extract';

runGraphify(action, args.slice(1));
