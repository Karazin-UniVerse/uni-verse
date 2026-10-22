const childProcess = require('node:child_process');
const puppeteer = require('puppeteer-core');
const { startServers } = require('./lhci-server.cjs');
const seedSession = require('./lhci-puppeteer.cjs');
const { verifyPage } = seedSession;
const { ci } = require('../.lighthouserc.cjs');

function runLhci(args, signal) {
  signal.throwIfAborted();

  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(
      process.execPath,
      [require.resolve('@lhci/cli/src/cli.js'), ...args],
      {
        stdio: 'inherit',
        detached: process.platform !== 'win32',
      },
    );
    let forceKill;
    const abort = () => {
      if (!child.pid) return;

      if (process.platform === 'win32') {
        const killer = childProcess.spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
        });

        killer.once('error', reject);
      } else {
        try {
          process.kill(-child.pid, 'SIGTERM');
          forceKill = setTimeout(() => {
            try {
              process.kill(-child.pid, 'SIGKILL');
            } catch (error) {
              if (error.code !== 'ESRCH') reject(error);
            }
          }, 5000);
        } catch (error) {
          if (error.code !== 'ESRCH') reject(error);
        }
      }
    };

    signal.addEventListener('abort', abort, { once: true });
    child.once('error', reject);
    child.once('close', (code) => {
      clearTimeout(forceKill);
      signal.removeEventListener('abort', abort);

      if (code === 0 && !signal.aborted) {
        resolve();
      } else if (signal.aborted) {
        reject(new Error(`LHCI ${args[0]} aborted`, { cause: signal.reason }));
      } else {
        reject(new Error(`LHCI ${args[0]} failed (${code})`));
      }
    });
  });
}

async function main() {
  const controller = new AbortController();
  const servers = startServers(controller);
  let browser;
  const stop = () => {
    controller.abort(new Error('Lighthouse audit interrupted'));
  };
  const cleanup = () => {
    void Promise.allSettled([browser?.close(), servers.close()]);
  };

  controller.signal.addEventListener('abort', cleanup, { once: true });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    await servers.ready;
    browser = await puppeteer.launch({
      ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : { channel: 'chrome' }),
      args: ci.collect.puppeteerLaunchOptions.args,
    });
    controller.signal.throwIfAborted();
    await seedSession(browser);
    let additive = false;

    for (const url of ci.collect.url) {
      for (let run = 0; run < ci.collect.numberOfRuns; run++) {
        controller.signal.throwIfAborted();
        await verifyPage(browser, url);
        await runLhci(
          [
            'collect',
            `--url=${url}`,
            '--numberOfRuns=1',
            `--chromePath=${browser.process().spawnargs[0]}`,
            `--additive=${additive}`,
          ],
          controller.signal,
        );
        additive = true;
        await verifyPage(browser, url);
      }
    }

    await runLhci(['assert'], controller.signal);
  } finally {
    await Promise.allSettled([browser?.close(), servers.close()]);
    controller.signal.removeEventListener('abort', cleanup);
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runLhci };
