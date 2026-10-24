const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const childProcess = require('node:child_process');
const { test, mock } = require('node:test');
const { runLhci } = require('../lhci-run.cjs');

test('POSIX cancellation gives Puppeteer SIGTERM before waiting for child cleanup', async () => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  const child = new EventEmitter();

  child.pid = 12345;
  const spawn = mock.method(childProcess, 'spawn', () => child);
  const kill = mock.method(process, 'kill', () => true);
  const controller = new AbortController();

  Object.defineProperty(process, 'platform', { value: 'linux' });

  try {
    const reason = new Error('Next.js exited during the audit (1)');
    const result = runLhci(['collect'], controller.signal);
    const rejected = assert.rejects(
      result,
      (error) => error.message.includes('LHCI collect aborted') && error.cause === reason,
    );

    controller.abort(reason);
    assert.deepEqual(
      kill.mock.calls.map((call) => call.arguments),
      [[-12345, 'SIGTERM']],
    );
    child.emit('close', null);
    await rejected;
  } finally {
    Object.defineProperty(process, 'platform', platform);
    kill.mock.restore();
    spawn.mock.restore();
  }
});

test('POSIX cancellation escalates only if the child has not closed after five seconds', async (context) => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  const child = new EventEmitter();

  child.pid = 12345;
  const spawn = mock.method(childProcess, 'spawn', () => child);
  const kill = mock.method(process, 'kill', () => true);
  const controller = new AbortController();

  context.mock.timers.enable({ apis: ['setTimeout'] });
  Object.defineProperty(process, 'platform', { value: 'linux' });

  try {
    const result = runLhci(['collect'], controller.signal);
    const rejected = assert.rejects(result, /LHCI collect aborted/);

    controller.abort();
    context.mock.timers.tick(4999);
    assert.equal(kill.mock.callCount(), 1);
    context.mock.timers.tick(1);
    assert.deepEqual(
      kill.mock.calls.map((call) => call.arguments),
      [
        [-12345, 'SIGTERM'],
        [-12345, 'SIGKILL'],
      ],
    );
    child.emit('close', null);
    await rejected;
  } finally {
    Object.defineProperty(process, 'platform', platform);
    kill.mock.restore();
    spawn.mock.restore();
  }
});

test('Windows cancellation terminates only the owned LHCI process tree', async () => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  const child = new EventEmitter();

  child.pid = 12345;
  const killer = new EventEmitter();
  const spawn = mock.method(childProcess, 'spawn', (command) =>
    command === 'taskkill' ? killer : child,
  );
  const controller = new AbortController();

  Object.defineProperty(process, 'platform', { value: 'win32' });

  try {
    const result = runLhci(['collect'], controller.signal);
    const rejected = assert.rejects(result, /LHCI collect aborted/);

    controller.abort();
    assert.deepEqual(spawn.mock.calls[1].arguments.slice(0, 2), [
      'taskkill',
      ['/PID', '12345', '/T', '/F'],
    ]);
    child.emit('close', null);
    await rejected;
  } finally {
    Object.defineProperty(process, 'platform', platform);
    spawn.mock.restore();
  }
});
