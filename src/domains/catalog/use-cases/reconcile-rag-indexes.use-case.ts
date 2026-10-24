import { connection } from '../../../infra/db';
import type { RagVectorStorePort } from '../ports/rag-vector-store.port';
import type { RagLexicalIndexPort } from '../ports/rag-lexical-index.port';
import type { RagAiGatewayPort } from '../ports/rag-ai-gateway.port';
import { generateSemanticChunks, type SemanticChunk } from '../services/semantic-chunker';

export interface ReconcileDbPort {
  getAllActiveProducts(): Promise<any[]>;
}

export class DrizzleReconcileDbAdapter implements ReconcileDbPort {
  private sqlClient: any;

  constructor(sqlClient?: any) {
    this.sqlClient = sqlClient || connection;
  }

  async getAllActiveProducts(): Promise<any[]> {
    const rows = await this.sqlClient`
      SELECT * FROM products WHERE (status = 'ACTIVE' OR status IS NULL) AND deleted_at IS NULL;
    `;
    return rows;
  }
}

export interface ReconciliationReport {
  consistentCount: number;
  syncedCount: number;
  orphanCleanedCount: number;
  details: Array<{
    productId: string;
    action: 'SYNCED' | 'ORPHAN_CLEANED' | 'CONSISTENT';
    reason?: string;
  }>;
}

export interface ReconcileRagIndexesOptions {
  db: ReconcileDbPort;
  vectorStore: RagVectorStorePort;
  lexicalIndex: RagLexicalIndexPort;
  aiGateway: RagAiGatewayPort;
}

export class ReconcileRagIndexesUseCase {
  constructor(private dependencies: ReconcileRagIndexesOptions) {}

  async execute(): Promise<ReconciliationReport> {
    const { db, vectorStore, lexicalIndex, aiGateway } = this.dependencies;

    // 1. Fetch active products from Postgres
    const activeProducts = await db.getAllActiveProducts();
    const pgProductsMap = new Map<string, any>();
    for (const p of activeProducts) {
      pgProductsMap.set(p.id, p);
    }

    // 2. Fetch all records from Chroma
    const chromaAll = await vectorStore.getAllRecords();
    const chromaByProduct = new Map<string, { ids: string[]; maxVersion: number }>();
    for (let i = 0; i < chromaAll.ids.length; i++) {
      const id = chromaAll.ids[i];
      if (!id) continue;
      const meta = (chromaAll.metadatas[i] as any) || {};
      const prodId = String(meta.productId || '');
      const ver = Number(meta.version || 0);
      if (!prodId) continue;

      const curr = chromaByProduct.get(prodId) || { ids: [], maxVersion: 0 };
      curr.ids.push(id);
      if (ver > curr.maxVersion) curr.maxVersion = ver;
      chromaByProduct.set(prodId, curr);
    }

    // 3. Fetch all indexed versions from SQLite
    const allVersions = await lexicalIndex.getAllVersions();
    const sqliteVersions = new Map<string, number>(allVersions.map((v) => [v.productId, v.version]));

    // 4. Collect all distinct product IDs across all 3 stores
    const allProductIds = new Set<string>([
      ...pgProductsMap.keys(),
      ...chromaByProduct.keys(),
      ...sqliteVersions.keys(),
    ]);

    const report: ReconciliationReport = {
      consistentCount: 0,
      syncedCount: 0,
      orphanCleanedCount: 0,
      details: [],
    };

    for (const prodId of allProductIds) {
      const pgProduct = pgProductsMap.get(prodId);

      // Case 2: Orphan chunks (Product missing from PG or inactive/deleted)
      if (!pgProduct) {
        await vectorStore.deleteByProductId(prodId);
        await lexicalIndex.deleteByProductId(prodId);
        report.orphanCleanedCount++;
        report.details.push({
          productId: prodId,
          action: 'ORPHAN_CLEANED',
          reason: 'Product not active or deleted in Postgres',
        });
        continue;
      }

      // Product exists in PG
      const pgVersion = Number(pgProduct.version ?? 1);
      const expectedChunks = generateSemanticChunks(pgProduct);

      const chromaData = chromaByProduct.get(prodId);
      const sqliteVersion = sqliteVersions.get(prodId) ?? null;

      const chromaConsistent =
        Boolean(chromaData) &&
        (chromaData?.maxVersion ?? 0) >= pgVersion &&
        (chromaData?.ids.length ?? 0) === expectedChunks.length;

      const sqliteConsistent = sqliteVersion !== null && sqliteVersion >= pgVersion;

      // Case 4: Identical versions and chunk count
      if (chromaConsistent && sqliteConsistent) {
        report.consistentCount++;
        report.details.push({
          productId: prodId,
          action: 'CONSISTENT',
        });
        continue;
      }

      // Case 1 (Outdated) or Case 3 (Partial index failure): Sync
      const reason = !chromaConsistent && !sqliteConsistent
        ? 'Both Chroma and SQLite are outdated or missing'
        : !chromaConsistent
        ? 'Chroma is outdated, missing chunks, or missing product'
        : 'SQLite FTS is outdated or missing product';

      // Inverted order: generate embeddings first
      const chunkEmbeddings: Array<{ chunk: SemanticChunk; vector: number[] }> = [];
      for (const chunk of expectedChunks) {
        const vector = await aiGateway.generateEmbeddings(chunk.content, 'RETRIEVAL_DOCUMENT');
        chunkEmbeddings.push({ chunk, vector });
      }

      // Delete old chunks
      await vectorStore.deleteByProductId(prodId);
      await lexicalIndex.deleteByProductId(prodId);

      // Upsert to Chroma
      await vectorStore.upsert(
        chunkEmbeddings.map((ce) => ({
          id: ce.chunk.id,
          embedding: ce.vector,
          document: ce.chunk.content,
          metadata: {
            productId: ce.chunk.metadata.productId,
            productName: ce.chunk.metadata.productName,
            category: ce.chunk.metadata.category,
            chunkType: ce.chunk.metadata.chunkType,
            version: Number(ce.chunk.metadata.version),
            status: ce.chunk.metadata.status,
          },
        }))
      );

      // Upsert to SQLite
      await lexicalIndex.upsertChunks(
        prodId,
        pgVersion,
        expectedChunks.map((c) => ({
          id: c.id,
          type: c.type,
          content: c.content,
        }))
      );

      report.syncedCount++;
      report.details.push({
        productId: prodId,
        action: 'SYNCED',
        reason,
      });
    }

    return report;
  }
}
