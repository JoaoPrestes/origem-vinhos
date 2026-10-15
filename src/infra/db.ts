import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('A variável de ambiente DATABASE_URL está ausente no arquivo .env.');
}

// Instância de conexão crua do postgres-js (útil para encerramento ou queries brutas)
export const connection = postgres(databaseUrl);

// Instância do Drizzle ORM integrada com o nosso schema de tabelas
export const db = drizzle(connection, { schema });
