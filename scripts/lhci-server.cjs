const { spawn } = require('node:child_process');
const path = require('node:path');
const { once } = require('node:events');
const { createMockApiServer } = require('./lhci-api.cjs');

function startServers() {
  const apiServer = createMockApiServer();

  apiServer.listen(3001, '127.0.0.1');
  const apiReady = once(apiServer, 'listening');
  const nextBin = path.resolve(__dirname, '../packages/uni-hub/node_modules/next/dist/bin/next');
  const nextProcess = spawn(process.execPath, [nextBin, 'start', '-p', '3000'], {
    cwd: path.resolve(__dirname, '../packages/uni-hub'),
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, NODE_ENV: 'production' },
  });
  let readyTimeout;
  const nextReady = new Promise((resolve, reject) => {
    readyTimeout = setTimeout(
      () => reject(new Error('Next.js did not start within 60 seconds')),
      60000,
    );
    nextProcess.once('error', reject);
    nextProcess.once('exit', (code) =>
      reject(new Error(`Next.js exited before the audit completed (${code})`)),
    );
    nextProcess.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);

      if (/Ready/i.test(chunk.toString())) resolve();
    });
  });
  const ready = Promise.all([apiReady, nextReady]).finally(() => clearTimeout(readyTimeout));

  return {
    ready,
    close: async () => {
      clearTimeout(readyTimeout);
      nextProcess.kill();
      await new Promise((resolve) => apiServer.close(resolve));
    },
  };
}

module.exports = { startServers };
