const assert = require('node:assert/strict');
const { once } = require('node:events');
const { after, before, test } = require('node:test');
const http = require('node:http');
const puppeteer = require('puppeteer-core');
const { createMockApiServer } = require('../lhci-api.cjs');
const { verifyPage } = require('../lhci-puppeteer.cjs');

test('mock API serves fixtures and rejects unknown routes, IDs and methods', async () => {
  const server = createMockApiServer();

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;

  try {
    const catalog = await fetch(`${origin}/opportunities?search=React`);

    assert.equal(catalog.status, 200);
    assert.equal(catalog.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(catalog.headers.get('access-control-allow-credentials'), 'true');
    assert.equal((await catalog.json()).length, 3);
    const detail = await fetch(`${origin}/opportunities/lhci-demo-1`);

    assert.equal((await detail.json()).id, 'lhci-demo-1');

    for (const route of [
      '/missing',
      '/opportunities/unknown',
      '/opportunities/lhci-demo-1/applications',
    ]) {
      assert.equal((await fetch(`${origin}${route}`)).status, 404, route);
    }

    assert.equal((await fetch(`${origin}/opportunities`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${origin}/opportunities`, { method: 'OPTIONS' })).status, 204);
    assert.deepEqual(await (await fetch(`${origin}/notifications`)).json(), []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

let browser;
let server;
let origin;
let responseBody;
const heading = '<h3>Frontend React &amp; Next.js Developer in Student Lab</h3>';

before(async () => {
  browser = await puppeteer.launch({
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : { channel: 'chrome' }),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const warmupPage = await browser.newPage();

  await warmupPage.close();
  server = http.createServer((request, response) => {
    if (request.url.startsWith('/opportunities/') && responseBody === 'redirect') {
      response.writeHead(302, { Location: '/login' });
      response.end();

      return;
    }

    response.setHeader('Content-Type', 'text/html');
    response.end(responseBody);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await browser?.close();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('smoke accepts the expected opportunity detail', async () => {
  responseBody = heading;
  await verifyPage(browser, `${origin}/opportunities/lhci-demo-1`, 5000);
});

test('smoke rejects a skeleton or error state without the opportunity', async () => {
  responseBody = '<main aria-busy="true">Loading</main>';
  await assert.rejects(verifyPage(browser, `${origin}/opportunities/lhci-demo-1`, 200));
  responseBody = '<main>Unable to load opportunity</main>';
  await assert.rejects(verifyPage(browser, `${origin}/opportunities/lhci-demo-1`, 200));
});

test('smoke rejects hidden fixture headings', async () => {
  for (const markup of [
    `<div hidden>${heading}</div>`,
    `<div style="visibility:hidden">${heading}</div>`,
    `<div style="opacity:0">${heading}</div>`,
  ]) {
    responseBody = markup;
    await assert.rejects(verifyPage(browser, `${origin}/opportunities/lhci-demo-1`, 200));
  }
});

test('smoke rejects login redirects even if fixture text exists', async () => {
  responseBody = 'redirect';
  await assert.rejects(
    verifyPage(browser, `${origin}/opportunities/lhci-demo-1`, 5000),
    /redirect/i,
  );
});

test('catalog smoke requires all three fixture headings', async () => {
  responseBody = heading;
  await assert.rejects(verifyPage(browser, `${origin}/opportunities`, 200));
  responseBody = `${heading}<h3>AI &amp; Data Science Research Assistant</h3><h3>UI/UX Designer for Campus Mobile Experience</h3>`;
  await verifyPage(browser, `${origin}/opportunities`, 5000);
});
