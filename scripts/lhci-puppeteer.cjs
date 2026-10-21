let initialized = false;

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
  if (initialized) {
    return;
  }

  const page = await browser.newPage();
  const fakeToken = buildFakeJwt();

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });

  await page.evaluate((token) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('accessToken', token);
    localStorage.setItem('username', 'Студент Тестовий');
    localStorage.setItem('isMoodleLinked', 'false');
    localStorage.setItem(
      'universe_feature_overrides',
      JSON.stringify({
        isOpportunitiesPlatformEnabled: true,
        isMoodleIntegrationEnabled: false,
      }),
    );
  }, fakeToken);

  await page.close();
  initialized = true;
};
