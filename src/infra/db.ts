import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const DEFAULT_LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/origemvinhos';

const databaseUrl = process.env.DATABASE_URL || (
  process.env.NODE_ENV === 'production'
    ? undefined
    : DEFAULT_LOCAL_DATABASE_URL
);

if (!databaseUrl) {
  throw new Error('A variável de ambiente DATABASE_URL está ausente no arquivo .env.');
}

// Instância de conexão crua do postgres-js (útil para encerramento ou queries brutas)
export const connection = postgres(databaseUrl, {
  max: process.env.NODE_ENV === 'test' ? 5 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Instância do Drizzle ORM integrada com o nosso schema de tabelas
export const db = drizzle(connection, { schema });
