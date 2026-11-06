#!/usr/bin/env node
import http from 'node:http';
import { existsSync, writeFileSync } from 'node:fs';

const port = Number(process.env.PORT);
const name = port === 3000 ? 'unihub' : 'grip';

http
  .createServer((req, res) => {
    if (req.url.includes('/slow')) {
      writeFileSync('/tmp/slow-started', '');
      setTimeout(() => res.end('finished'), 1500);

      return;
    }

    if (req.url.includes('__container_readiness_probe__')) {
      res.writeHead(existsSync(`/tmp/fail-${port}`) ? 503 : 404).end();

      return;
    }

    if (req.url.includes('__health_fail')) {
      res.writeHead(503).end();

      return;
    }

    if (req.url.includes('callback')) {
      res.setHeader('X-Fixture-URL', req.url);
      res.setHeader('X-Fixture-Cookie', req.headers.cookie ?? '');
      res.setHeader('Set-Cookie', ['one=1; Path=/', 'two=2; Path=/']);
      res.setHeader('Location', '/dev-tools/grip?done=1');
      res.writeHead(302).end();

      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ name, url: req.url, headers: req.headers }));
  })
  .listen(port, '127.0.0.1');
