import { defineConfig } from 'vitest/config';

export default defineConfig({
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
