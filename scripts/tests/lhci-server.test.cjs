const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const childProcess = require('node:child_process');
const { test, mock } = require('node:test');
const { startServers } = require('../lhci-server.cjs');

async function occupyPort(port) {
  const server = http.createServer();

  server.listen(port, '127.0.0.1');
  await once(server, 'listening');

  return server;
}

test('occupied mock port fails with a useful diagnostic without starting Next.js', async () => {
  const occupied = await occupyPort(3001);
  const spawn = mock.method(childProcess, 'spawn');
  const controller = new AbortController();
  const servers = startServers(controller);

  try {
    await assert.rejects(servers.ready, /3001.*already in use/i);
    assert.equal(spawn.mock.callCount(), 0);
  } finally {
    await servers.close();
    spawn.mock.restore();
    await new Promise((resolve) => occupied.close(resolve));
  }
});

test('occupied frontend port fails without killing its owner and releases the mock port', async () => {
  const occupied = await occupyPort(3000);
  const controller = new AbortController();
  const servers = startServers(controller);

  try {
    await assert.rejects(servers.ready, /3000.*already in use/i);
    await servers.close();
    await servers.close();
    assert.equal(occupied.listening, true);
    const probe = await occupyPort(3001);

    await new Promise((resolve) => probe.close(resolve));
  } finally {
    await servers.close();
    await new Promise((resolve) => occupied.close(resolve));
  }
});

test('close waits for the owned Next process to exit and is safe to repeat', async () => {
  const originalSpawn = childProcess.spawn;
  let ownedProcess;
  const spawn = mock.method(childProcess, 'spawn', (_command, _args, options) => {
    ownedProcess = originalSpawn(
      process.execPath,
      ['-e', "console.info('Ready'); setInterval(() => {}, 1000)"],
      options,
    );

    return ownedProcess;
  });
  const servers = startServers(new AbortController());

  try {
    await servers.ready;
    await Promise.all([servers.close(), servers.close()]);
    assert.ok(ownedProcess.exitCode !== null || ownedProcess.signalCode !== null);
    const probe = await occupyPort(3001);

    await new Promise((resolve) => probe.close(resolve));
  } finally {
    await servers.close();
    spawn.mock.restore();
  }
});

test('unexpected Next exit aborts the audit after readiness', async () => {
  const originalSpawn = childProcess.spawn;
  let ownedProcess;
  const spawn = mock.method(childProcess, 'spawn', (_command, _args, options) => {
    ownedProcess = originalSpawn(
      process.execPath,
      ['-e', "console.info('Ready'); setInterval(() => {}, 1000)"],
      options,
    );

    return ownedProcess;
  });
  const controller = new AbortController();
  const servers = startServers(controller);

  try {
    await servers.ready;
    const aborted = once(controller.signal, 'abort');

    ownedProcess.kill();
    await aborted;
    assert.match(controller.signal.reason.message, /Next.js exited/i);
  } finally {
    await servers.close();
    spawn.mock.restore();
  }
});

test('closing immediately during startup does not leave a listener or launch Next.js', async () => {
  const spawn = mock.method(childProcess, 'spawn');
  const servers = startServers(new AbortController());

  try {
    await servers.close();
    await servers.ready;
    assert.equal(spawn.mock.callCount(), 0);
    const probe = await occupyPort(3001);

    await new Promise((resolve) => probe.close(resolve));
  } finally {
    await servers.close();
    spawn.mock.restore();
  }
});
