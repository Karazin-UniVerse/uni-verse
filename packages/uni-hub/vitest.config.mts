import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@uni-hub': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, '../core'),
      '@una': path.resolve(__dirname, '../ui/components/una'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
