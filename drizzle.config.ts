import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infra/schema.ts',
  out: './src/infra/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/origemvinhos',
  },
});
