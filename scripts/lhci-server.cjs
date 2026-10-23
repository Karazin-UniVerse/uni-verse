const childProcess = require('node:child_process');
const path = require('node:path');
const { once } = require('node:events');
const http = require('node:http');
const { createMockApiServer } = require('./lhci-api.cjs');

function startServers(controller) {
  const apiServer = createMockApiServer();
  let nextProcess;
  let exited;
  let readyTimeout;
  let closing = false;
  let closePromise;

  const ready = (async () => {
    try {
      apiServer.listen(3001, '127.0.0.1');
      await once(apiServer, 'listening');
    } catch (error) {
      throw new Error(
        `Mock API port 3001 is unavailable (${error.code}); stop the process already in use before auditing`,
        { cause: error },
      );
    }

    if (closing) return;

    const probe = http.createServer();

    try {
      probe.listen(3000, '127.0.0.1');
      await once(probe, 'listening');
    } catch (error) {
      throw new Error(
        `Frontend port 3000 is unavailable (${error.code}); stop the process already in use before auditing`,
        { cause: error },
      );
    } finally {
      if (probe.listening) await new Promise((resolve) => probe.close(resolve));
    }

    if (closing) return;

    controller.signal.throwIfAborted();
    const nextBin = path.resolve(__dirname, '../packages/uni-hub/node_modules/next/dist/bin/next');

    nextProcess = childProcess.spawn(
      process.execPath,
      [nextBin, 'start', '-p', '3000', '-H', '127.0.0.1'],
      {
        cwd: path.resolve(__dirname, '../packages/uni-hub'),
        stdio: ['ignore', 'pipe', 'inherit'],
        env: { ...process.env, NODE_ENV: 'production' },
      },
    );
    exited = new Promise((resolve) => nextProcess.once('close', resolve));

    await new Promise((resolve, reject) => {
      readyTimeout = setTimeout(
        () => reject(new Error('Next.js did not start within 60 seconds')),
        60000,
      );
      nextProcess.once('error', reject);
      nextProcess.once('exit', (code, signal) => {
        const error = new Error(`Next.js exited during the audit (${code ?? signal})`);

        if (!closing) {
          controller.abort(error);
        }

        reject(error);
      });
      nextProcess.stdout.on('data', (chunk) => {
        process.stdout.write(chunk);

        if (/Ready/i.test(chunk.toString())) resolve();
      });
    });
  })().finally(() => clearTimeout(readyTimeout));

  return {
    ready,
    close: () => {
      closePromise ??= (async () => {
        closing = true;
        clearTimeout(readyTimeout);

        if (nextProcess && nextProcess.exitCode === null && nextProcess.signalCode === null) {
          nextProcess.kill();
          const forceKill = setTimeout(() => nextProcess.kill('SIGKILL'), 5000);

          try {
            await exited;
          } finally {
            clearTimeout(forceKill);
          }
        }

        await ready.catch(() => undefined);
        apiServer.closeAllConnections();
        await new Promise((resolve) => apiServer.close(resolve));
      })();

      return closePromise;
    },
  };
}

module.exports = { startServers };
