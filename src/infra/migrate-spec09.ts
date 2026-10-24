import postgres from 'postgres';

async function applyMigrationTo(url: string) {
  const sqlClient = postgres(url);
  console.log(`Aplicando migrações da spec09 em: ${url}...`);
  
  await sqlClient`
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sensory_profile text,
    ADD COLUMN IF NOT EXISTS pairing text,
    ADD COLUMN IF NOT EXISTS harvest_notes text,
    ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
  `;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS catalog_outbox (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL,
      event_type text NOT NULL,
      version integer NOT NULL,
      status text NOT NULL DEFAULT 'PENDING',
      retry_count integer NOT NULL DEFAULT 0,
      locked_until timestamp,
      error_message text,
      created_at timestamp NOT NULL DEFAULT now(),
      processed_at timestamp
    );
  `;

  await sqlClient`
    CREATE INDEX IF NOT EXISTS catalog_outbox_pending_idx ON catalog_outbox (status, created_at);
  `;
  await sqlClient`
    CREATE INDEX IF NOT EXISTS catalog_outbox_lease_idx ON catalog_outbox (status, locked_until);
  `;
  await sqlClient`
    CREATE INDEX IF NOT EXISTS catalog_outbox_product_idx ON catalog_outbox (product_id);
  `;
  await sqlClient.end();
}

async function migrate() {
  const devUrl = 'postgresql://postgres:postgres@localhost:5432/origemvinhos';
  const testUrl = 'postgresql://postgres:postgres@localhost:5432/origemvinhos_test';

  await applyMigrationTo(devUrl);
  await applyMigrationTo(testUrl);

  console.log('Migrações concluídas em ambos os bancos!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
