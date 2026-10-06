import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@uni-hub': path.resolve(__dirname, '.'),
      '@core': path.resolve(__dirname, '../core'),
      '@ui': path.resolve(__dirname, '../ui'),
      '@una': path.resolve(__dirname, '../ui/components/una'),
      react: path.dirname(require.resolve('react/package.json')),
      'react-dom': path.dirname(require.resolve('react-dom/package.json')),
      'lucide-react': path.dirname(require.resolve('lucide-react/package.json')),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
