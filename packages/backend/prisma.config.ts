import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

if (!process.env.DATABASE_URL) {
  const envPath = resolve(__dirname, '.env');
  const rootEnvPath = resolve(__dirname, '../../.env');

  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  } else if (existsSync(rootEnvPath)) {
    process.loadEnvFile(rootEnvPath);
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/postgres',
  },
});
