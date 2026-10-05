import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['components/**/*.test.tsx', 'components/**/*.test.ts'],
  },
});
