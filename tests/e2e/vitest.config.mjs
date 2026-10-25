import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  root: path.resolve(__dirname, '../..'),
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, '../../packages/core'),
      '@uni-hub': path.resolve(__dirname, '../../packages/uni-hub'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 10000,
  },
};
