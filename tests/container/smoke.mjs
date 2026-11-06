import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { readFileSync } from 'node:fs';

const image = 'universe-frontend-smoke:local';

assert.match(readFileSync('Dockerfile.frontend', 'utf8'), /^FROM node:24\.20\.0-alpine AS base/m);
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();

docker('build', '-f', 'tests/container/Dockerfile', '-t', image, '.');

async function start(containerPort = 8080) {
  const id = docker(
    'run',
    '-d',
    '-e',
    `PORT=${containerPort}`,
    '-p',
    `127.0.0.1::${containerPort}`,
    image,
  );
  const port = docker('port', id, `${containerPort}/tcp`).split(':').at(-1);
  const url = `http://127.0.0.1:${port}`;

  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${url}/readyz`)).ok) return { id, url };
    } catch {}

    await delay(200);
  }

  throw new Error(`container ${id} never became ready: ${docker('logs', id)}`);
}

async function stopped(id) {
  for (let i = 0; i < 100; i++) {
    const state = JSON.parse(docker('inspect', id))[0].State;

    if (!state.Running) return state.ExitCode;

    await delay(100);
  }

  throw new Error(`container ${id} did not stop`);
}

let current;

try {
  current = await start();

  for (const [path, name] of [
    ['/dev-tools/grip', 'grip'],
    ['/dev-tools/grip/', 'grip'],
    ['/dev-tools/grip/_next/static/a.js', 'grip'],
    ['/dev-tools/gripper', 'unihub'],
    ['/', 'unihub'],
    ['/storybook/', 'unihub'],
  ]) {
    const result = await (await fetch(current.url + path)).json();

    assert.equal(result.name, name, path);
    assert.equal(result.url, path);
  }

  const response = await fetch(`${current.url}/dev-tools/grip/callback?code=a%2Bb`, {
    redirect: 'manual',
    headers: {
      cookie: 'session=abc',
      'x-forwarded-for': '1.2.3.4',
      forwarded: 'for=1.2.3.4',
      'x-real-ip': '1.2.3.4',
    },
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('x-fixture-url'), '/dev-tools/grip/callback?code=a%2Bb');
  assert.equal(response.headers.get('x-fixture-cookie'), 'session=abc');
  assert.equal(response.headers.get('location'), '/dev-tools/grip?done=1');
  assert.deepEqual(response.headers.getSetCookie(), ['one=1; Path=/', 'two=2; Path=/']);
  const forwarded = await (
    await fetch(`${current.url}/dev-tools/grip/api?code=a%2Bb`, {
      headers: {
        cookie: 'session=abc',
        'x-forwarded-for': '1.2.3.4',
        forwarded: 'for=1.2.3.4',
        'x-real-ip': '1.2.3.4',
      },
    })
  ).json();

  assert.equal(forwarded.url, '/dev-tools/grip/api?code=a%2Bb');
  assert.equal(forwarded.headers.cookie, 'session=abc');
  assert.notEqual(forwarded.headers['x-forwarded-for'], '1.2.3.4');
  assert.notEqual(forwarded.headers['x-real-ip'], '1.2.3.4');
  assert.equal(forwarded.headers.forwarded, undefined);
  const oversized = 'x'.repeat(256 * 1024 + 1);

  assert.equal(
    (await fetch(`${current.url}/dev-tools/grip/api`, { method: 'POST', body: oversized })).status,
    413,
  );
  assert.equal(
    (await fetch(`${current.url}/ordinary`, { method: 'POST', body: oversized })).status,
    200,
  );

  for (const port of [3000, 3002]) {
    docker('exec', current.id, 'touch', `/tmp/fail-${port}`);
    assert.equal((await fetch(`${current.url}/readyz`)).ok, false);
    docker('exec', current.id, 'rm', `/tmp/fail-${port}`);
    assert.equal((await fetch(`${current.url}/readyz`)).ok, true);
  }

  const slow = fetch(`${current.url}/dev-tools/grip/slow`).then((r) => r.text());

  for (let i = 0; i < 50; i++) {
    try {
      docker('exec', current.id, 'test', '-f', '/tmp/slow-started');
      break;
    } catch {
      await delay(50);
    }
  }

  const stop = spawn('docker', ['stop', '-t', '15', current.id]);

  assert.equal(await slow, 'finished');
  assert.equal(await new Promise((resolve) => stop.on('exit', resolve)), 0);
  assert.equal(await stopped(current.id), 0);
  docker('rm', current.id);
  current = undefined;

  for (const port of [3000, 3002]) {
    current = await start();
    docker('exec', current.id, 'sh', '-c', `kill -KILL $(lsof -ti TCP:${port} -sTCP:LISTEN)`);
    assert.notEqual(await stopped(current.id), 0);
    docker('rm', current.id);
    current = undefined;
  }

  current = await start(8091);
  docker('exec', current.id, 'sh', '-c', 'kill -KILL $(cat /tmp/frontend-nginx.pid)');
  assert.notEqual(await stopped(current.id), 0);
  docker('rm', current.id);
  current = undefined;
  console.info('container smoke passed');
} finally {
  if (current) docker('rm', '-f', current.id);
}
