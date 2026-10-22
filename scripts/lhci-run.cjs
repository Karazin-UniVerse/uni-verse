const { spawn } = require('node:child_process');
const puppeteer = require('puppeteer-core');
const { startServers } = require('./lhci-server.cjs');
const seedSession = require('./lhci-puppeteer.cjs');
const { verifyPage } = seedSession;
const { ci } = require('../.lighthouserc.cjs');

function runLhci(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve('@lhci/cli/src/cli.js'), ...args], {
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`LHCI ${args[0]} failed (${code})`));
    });
  });
}

async function main() {
  const servers = startServers();
  let browser;
  const stop = () => {
    void servers.close();
  };

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
    await seedSession(browser);
    let additive = false;

    for (const url of ci.collect.url) {
      for (let run = 0; run < ci.collect.numberOfRuns; run++) {
        await verifyPage(browser, url);
        await runLhci([
          'collect',
          `--url=${url}`,
          '--numberOfRuns=1',
          `--chromePath=${browser.process().spawnargs[0]}`,
          `--additive=${additive}`,
        ]);
        additive = true;
        await verifyPage(browser, url);
      }
    }

    await runLhci(['assert']);
  } finally {
    await browser?.close();
    await servers.close();
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
