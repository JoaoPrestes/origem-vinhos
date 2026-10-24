import { BunSqliteFtsAdapter } from '../domains/catalog/adapters/bun-sqlite-fts.adapter';
import { ChromaVectorStoreAdapter } from '../domains/catalog/adapters/chroma-vector-store.adapter';
import { GeminiAiAdapter } from '../domains/catalog/adapters/gemini-ai.adapter';
import {
  ProcessCatalogOutboxUseCase,
  DrizzleCatalogOutboxDbAdapter,
} from '../domains/catalog/use-cases/process-catalog-outbox.use-case';

const SQLITE_PATH = process.env.SQLITE_DB_PATH || 'origem_catalog.db';
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const POLL_INTERVAL_MS = Number(process.env.CATALOG_OUTBOX_POLL_INTERVAL_MS || 2000);
const BATCH_SIZE = Number(process.env.CATALOG_OUTBOX_BATCH_SIZE || 10);

export async function startCatalogIngestionWorker(): Promise<() => void> {
  console.log(`[Worker] Starting Catalog Ingestion Worker...`);
  console.log(`[Worker] SQLite FTS: ${SQLITE_PATH}`);
  console.log(`[Worker] ChromaDB: ${CHROMA_URL}`);

  const lexicalIndex = new BunSqliteFtsAdapter(SQLITE_PATH);
  const vectorStore = new ChromaVectorStoreAdapter({ url: CHROMA_URL });
  const aiGateway = new GeminiAiAdapter();
  const db = new DrizzleCatalogOutboxDbAdapter();

  const useCase = new ProcessCatalogOutboxUseCase({
    db,
    vectorStore,
    lexicalIndex,
    aiGateway,
  });

  let running = true;

  const loop = async () => {
    while (running) {
      try {
        const { processed, failed } = await useCase.executeBatch(BATCH_SIZE);
        if (processed > 0 || failed > 0) {
          console.log(`[Worker] Batch processed: ${processed} success, ${failed} failed`);
        }
      } catch (err) {
        console.error(`[Worker] Error in ingestion loop:`, err);
      }

      await Bun.sleep(POLL_INTERVAL_MS);
    }
    console.log(`[Worker] Ingestion worker stopped.`);
  };

  loop();

  return () => {
    running = false;
  };
}

if (import.meta.main) {
  startCatalogIngestionWorker().then((stop) => {
    const shutdown = () => {
      console.log(`[Worker] Received shutdown signal...`);
      stop();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}
