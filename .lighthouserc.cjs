module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/opportunities',
        'http://localhost:3000/opportunities/lhci-demo-1',
      ],
      numberOfRuns: 3,
      puppeteerScript: './scripts/lhci-puppeteer.cjs',
      puppeteerLaunchOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      },
      settings: {
        disableStorageReset: true,
        onlyCategories: ['performance', 'accessibility'],
        throttling: {
          cpuSlowdownMultiplier: 2,
        },
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 2500, aggregationMethod: 'median-run' },
        ],
        'cumulative-layout-shift': [
          'error',
          { maxNumericValue: 0.1, aggregationMethod: 'median-run' },
        ],
        'total-blocking-time': ['error', { maxNumericValue: 220, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
      },
    },
  },
};
