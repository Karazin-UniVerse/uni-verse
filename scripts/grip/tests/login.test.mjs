import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { test } from 'node:test';
import { launchBrowser, loginDevice } from '../device-login.mjs';

function startFakeGithubServer() {
  let pollCount = 0;
  let slowDownTriggered = false;

  const server = http.createServer((req, res) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      if (req.url === '/login/device/code') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            device_code: 'dev_code_123',
            user_code: 'WDJB-MJHT',
            verification_uri: 'http://localhost/activate',
            expires_in: 900,
            interval: 1,
          }),
        );

        return;
      }

      if (req.url === '/login/oauth/access_token') {
        pollCount++;

        if (body.includes('simulate_slowdown') && !slowDownTriggered) {
          slowDownTriggered = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'slow_down', error_description: 'Slow down' }));

          return;
        }

        if (body.includes('simulate_denial')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'access_denied', error_description: 'Denied' }));

          return;
        }

        if (pollCount === 1) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'authorization_pending', error_description: 'Pending' }));

          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: 'gho_mock_access_token_12345' }));

        return;
      }

      res.writeHead(404);
      res.end();
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();

      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((cb) => server.close(cb)),
      });
    });
  });
}

test('loginDevice polls, handles pending, and returns access_token', async () => {
  const fakeGithub = await startFakeGithubServer();

  try {
    const logs = [];
    const logger = (msg) => logs.push(msg);

    const token = await loginDevice({
      clientId: 'test-client',
      githubBaseUrl: fakeGithub.url,
      logger,
    });

    assert.equal(token, 'gho_mock_access_token_12345');
    assert.ok(logs.some((l) => l.includes('WDJB-MJHT')));
    assert.ok(!logs.some((l) => l.includes('gho_mock_access_token_12345')));
  } finally {
    await fakeGithub.close();
  }
});

test('loginDevice handles slow_down response and recovers', async () => {
  const fakeGithub = await startFakeGithubServer();

  try {
    const token = await loginDevice({
      clientId: 'simulate_slowdown',
      githubBaseUrl: fakeGithub.url,
      logger: () => {},
    });

    assert.equal(token, 'gho_mock_access_token_12345');
  } finally {
    await fakeGithub.close();
  }
});

test('loginDevice throws on access_denied', async () => {
  const fakeGithub = await startFakeGithubServer();

  try {
    await assert.rejects(
      loginDevice({
        clientId: 'simulate_denial',
        githubBaseUrl: fakeGithub.url,
        logger: () => {},
      }),
      /Access was denied/i,
    );
  } finally {
    await fakeGithub.close();
  }
});

test('loginDevice invokes openBrowserFn with verificationUri', async () => {
  const fakeGithub = await startFakeGithubServer();

  try {
    const opened = [];

    await loginDevice({
      clientId: 'test-client',
      githubBaseUrl: fakeGithub.url,
      logger: () => {},
      openBrowser: true,
      openBrowserFn: (url) => opened.push(url),
    });

    assert.equal(opened.length, 1);
    assert.equal(opened[0], 'http://localhost/activate');
  } finally {
    await fakeGithub.close();
  }
});

test('launchBrowser handles child error event without unhandled rejection or throw', async () => {
  const childSuccess = new EventEmitter();

  childSuccess.unref = () => {};
  let spawned = false;

  launchBrowser('https://github.com/login/device', {
    spawnFn: () => {
      process.nextTick(() => childSuccess.emit('spawn'));

      return childSuccess;
    },
    onSpawn: () => {
      spawned = true;
    },
  });

  const childError = new EventEmitter();

  childError.unref = () => {};
  let errored = false;

  launchBrowser('https://github.com/login/device', {
    spawnFn: () => {
      process.nextTick(() => childError.emit('error', new Error('spawn ENOENT')));

      return childError;
    },
    onError: () => {
      errored = true;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(spawned, true);
  assert.equal(errored, true);
});
