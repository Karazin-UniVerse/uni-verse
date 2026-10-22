const { mockOpportunities } = require('./lhci-api.cjs');

function buildFakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'student-lhci-1',
      email: 'student.lhci@student.karazin.ua',
      name: 'Студент Тестовий',
      roles: ['OPPORTUNITIES_USER'],
    }),
  ).toString('base64url');

  return `${header}.${payload}.signature`;
}

/**
 * @param {import('puppeteer-core').Browser} browser
 */
module.exports = async (browser) => {
  const page = await browser.newPage();
  const fakeToken = buildFakeJwt();

  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate((token) => {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('accessToken', token);
      localStorage.setItem('username', 'Студент Тестовий');
      localStorage.setItem('isMoodleLinked', 'false');
    }, fakeToken);
  } finally {
    await page.close();
  }
};

async function verifyPage(browser, url, timeout = 15000) {
  const page = await browser.newPage();
  const expected =
    new URL(url).pathname === '/opportunities'
      ? mockOpportunities
      : mockOpportunities.filter(
          (opportunity) => new URL(url).pathname === `/opportunities/${opportunity.id}`,
        );

  if (expected.length === 0) {
    await page.close();
    throw new Error(`Unexpected audit route: ${url}`);
  }

  try {
    await page.setCacheEnabled(false);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    if (!response?.ok() || page.url() !== url) {
      throw new Error(
        `Audit route failed or redirected (${response?.status()}): ${url} -> ${page.url()}`,
      );
    }

    await page.waitForFunction(
      (titles) => {
        const headings = [...document.querySelectorAll('h3')]
          .filter((node) =>
            node.checkVisibility({ visibilityProperty: true, opacityProperty: true }),
          )
          .map((node) => node.textContent);

        return titles.every((title) => headings.includes(title));
      },
      { timeout },
      expected.map((opportunity) => opportunity.title),
    );

    if (page.url() !== url) {
      throw new Error(`Audit route redirected: ${url} -> ${page.url()}`);
    }
  } finally {
    await page.close();
  }
}

module.exports.verifyPage = verifyPage;
