import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.argv = process.argv.map((arg) => {
  const stripped = arg.replace(/^packages[\\/]ui[\\/]/, '');

  return stripped.replace(/\\/g, '/');
});

export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, '../core'),
      '@una': path.resolve(__dirname, './components/una'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    include: [
      'packages/ui/components/**/*.test.tsx',
      'packages/ui/components/**/*.test.ts',
      'packages/ui/hooks/**/*.test.ts',
      'packages/ui/hooks/**/*.test.tsx',
      'components/**/*.test.tsx',
      'components/**/*.test.ts',
      'hooks/**/*.test.ts',
      'hooks/**/*.test.tsx',
    ],
  },
});
