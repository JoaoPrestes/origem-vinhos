import { BunSqliteFtsAdapter } from '../domains/catalog/adapters/bun-sqlite-fts.adapter';
import { ChromaVectorStoreAdapter } from '../domains/catalog/adapters/chroma-vector-store.adapter';
import { GeminiAiAdapter } from '../domains/catalog/adapters/gemini-ai.adapter';
import {
  ReconcileRagIndexesUseCase,
  DrizzleReconcileDbAdapter,
} from '../domains/catalog/use-cases/reconcile-rag-indexes.use-case';

const SQLITE_PATH = process.env.SQLITE_DB_PATH || 'origem_catalog.db';
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

export async function runReconcileCli(): Promise<void> {
  console.log(`[Reconcile CLI] Starting 3-way differential audit...`);
  console.log(`[Reconcile CLI] SQLite: ${SQLITE_PATH}`);
  console.log(`[Reconcile CLI] ChromaDB: ${CHROMA_URL}`);

  const lexicalIndex = new BunSqliteFtsAdapter(SQLITE_PATH);
  const vectorStore = new ChromaVectorStoreAdapter({ url: CHROMA_URL });
  const aiGateway = new GeminiAiAdapter();
  const db = new DrizzleReconcileDbAdapter();

  const useCase = new ReconcileRagIndexesUseCase({
    db,
    vectorStore,
    lexicalIndex,
    aiGateway,
  });

  const report = await useCase.execute();

  console.log(`\n================ RECONCILIATION REPORT ================`);
  console.log(`Consistent Products (0 AI calls): ${report.consistentCount}`);
  console.log(`Synced Products (Re-indexed):    ${report.syncedCount}`);
  console.log(`Orphan Products Cleaned:        ${report.orphanCleanedCount}`);
  console.log(`=======================================================\n`);

  if (report.details.length > 0) {
    for (const d of report.details) {
      if (d.action !== 'CONSISTENT') {
        console.log(`[${d.action}] Product ${d.productId} - ${d.reason || ''}`);
      }
    }
  }

  process.exit(0);
}

if (import.meta.main) {
  runReconcileCli().catch((err) => {
    console.error(`[Reconcile CLI] Fatal error:`, err);
    process.exit(1);
  });
}
