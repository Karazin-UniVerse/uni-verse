import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, '../core'),
      '@una': path.resolve(__dirname, './components/una'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'components/**/*.test.tsx',
      'components/**/*.test.ts',
      'hooks/**/*.test.ts',
      'hooks/**/*.test.tsx',
    ],
  },
});
