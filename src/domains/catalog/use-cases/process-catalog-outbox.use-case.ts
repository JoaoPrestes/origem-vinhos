import { connection } from '../../../infra/db';
import type { RagVectorStorePort } from '../ports/rag-vector-store.port';
import type { RagLexicalIndexPort } from '../ports/rag-lexical-index.port';
import type { RagAiGatewayPort } from '../ports/rag-ai-gateway.port';
import { generateSemanticChunks, type SemanticChunk } from '../services/semantic-chunker';

export interface CatalogOutboxDbPort {
  claimPendingEvents(batchSize: number, workerId?: string): Promise<Array<{
    id: string;
    productId: string;
    eventType: string;
    version: number;
    status: string;
    retryCount: number;
  }>>;
  findProductById(id: string): Promise<any | null>;
  markEventProcessed(id: string): Promise<void>;
  markEventFailed(id: string, errorMessage: string): Promise<void>;
  supersedeEvents?(ids: string[]): Promise<void>;
}

export class DrizzleCatalogOutboxDbAdapter implements CatalogOutboxDbPort {
  private sqlClient: any;

  constructor(sqlClient?: any) {
    this.sqlClient = sqlClient || connection;
  }

  async claimPendingEvents(batchSize: number = 10): Promise<any[]> {
    const rows = await this.sqlClient`
      UPDATE catalog_outbox
      SET status = 'PROCESSING',
          locked_until = NOW() + INTERVAL '5 minutes',
          retry_count = retry_count + 1
      WHERE id IN (
        SELECT id FROM catalog_outbox
        WHERE (status = 'PENDING')
           OR (status = 'PROCESSING' AND (locked_until IS NULL OR locked_until < NOW()))
        ORDER BY created_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING 
        id, 
        product_id AS "productId", 
        event_type AS "eventType", 
        version, 
        status, 
        retry_count AS "retryCount";
    `;
    return rows;
  }

  async findProductById(id: string): Promise<any | null> {
    const rows = await this.sqlClient`
      SELECT * FROM products WHERE id = ${id} LIMIT 1;
    `;
    return rows[0] || null;
  }

  async markEventProcessed(id: string): Promise<void> {
    await this.sqlClient`
      UPDATE catalog_outbox
      SET status = 'PROCESSED',
          processed_at = NOW(),
          error_message = NULL
      WHERE id = ${id};
    `;
  }

  async markEventFailed(id: string, errorMessage: string): Promise<void> {
    await this.sqlClient`
      UPDATE catalog_outbox
      SET status = CASE WHEN retry_count >= 5 THEN 'FAILED' ELSE 'PENDING' END,
          error_message = ${errorMessage},
          locked_until = NULL
      WHERE id = ${id};
    `;
  }

  async supersedeEvents(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.sqlClient`
      UPDATE catalog_outbox
      SET status = 'PROCESSED',
          processed_at = NOW(),
          error_message = 'SUPERSEDED'
      WHERE id IN ${this.sqlClient(ids)};
    `;
  }
}

export interface ProcessCatalogOutboxUseCaseOptions {
  db: CatalogOutboxDbPort;
  vectorStore: RagVectorStorePort;
  lexicalIndex: RagLexicalIndexPort;
  aiGateway: RagAiGatewayPort;
}

export class ProcessCatalogOutboxUseCase {
  constructor(private dependencies: ProcessCatalogOutboxUseCaseOptions) {}

  async executeBatch(batchSize: number = 10): Promise<{ processed: number; failed: number }> {
    const events = await this.dependencies.db.claimPendingEvents(batchSize);
    if (!events || events.length === 0) {
      return { processed: 0, failed: 0 };
    }

    const eventsByProduct = new Map<string, typeof events>();
    for (const event of events) {
      const list = eventsByProduct.get(event.productId) || [];
      list.push(event);
      eventsByProduct.set(event.productId, list);
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const [productId, productEvents] of eventsByProduct.entries()) {
      productEvents.sort((a, b) => b.version - a.version);
      const latestEvent = productEvents[0];
      const supersededEvents = productEvents.slice(1);

      try {
        await this.processEvent(latestEvent);
        await this.dependencies.db.markEventProcessed(latestEvent.id);
        if (supersededEvents.length > 0 && this.dependencies.db.supersedeEvents) {
          await this.dependencies.db.supersedeEvents(supersededEvents.map((e) => e.id));
        }
        processedCount += productEvents.length;
      } catch (err: any) {
        failedCount += productEvents.length;
        const errMsg = err?.message || String(err);
        await this.dependencies.db.markEventFailed(latestEvent.id, errMsg);
      }
    }

    return { processed: processedCount, failed: failedCount };
  }

  private async processEvent(event: { id: string; productId: string; eventType: string; version: number }): Promise<void> {
    const { db, vectorStore, lexicalIndex, aiGateway } = this.dependencies;

    const product = await db.findProductById(event.productId);

    if (event.eventType === 'PRODUCT_DELETED' || !product || product.status === 'INACTIVE' || product.deleted_at) {
      await vectorStore.deleteByProductId(event.productId);
      await lexicalIndex.deleteByProductId(event.productId);
      return;
    }

    const chunks = generateSemanticChunks(product);

    // Dual Version Guard (spec09 §6.3 & §10.2)
    const chromaRecords = await vectorStore.getByProductId(event.productId);
    const sqliteVersion = await lexicalIndex.getVersion(event.productId);

    const chromaVersions = chromaRecords.metadatas.map((m) => Number(m.version || 0));
    const chromaAllMatch =
      chromaRecords.ids.length === chunks.length && chromaVersions.every((v) => v >= event.version);
    const sqliteMatch = sqliteVersion !== null && sqliteVersion >= event.version;

    if (chromaAllMatch && sqliteMatch) {
      return;
    }

    // Inverted Order (spec09 §6.3 & BDD Cenário 13):
    // Generate embeddings BEFORE deleting existing chunks
    const chunkEmbeddings: Array<{ chunk: SemanticChunk; vector: number[] }> = [];
    for (const chunk of chunks) {
      const vector = await aiGateway.generateEmbeddings(chunk.content, 'RETRIEVAL_DOCUMENT');
      chunkEmbeddings.push({ chunk, vector });
    }

    // Now delete old chunks from both stores
    await vectorStore.deleteByProductId(event.productId);
    await lexicalIndex.deleteByProductId(event.productId);

    // Upsert to ChromaDB
    await vectorStore.upsert({
      ids: chunkEmbeddings.map((ce) => ce.chunk.id),
      embeddings: chunkEmbeddings.map((ce) => ce.vector),
      documents: chunkEmbeddings.map((ce) => ce.chunk.content),
      metadatas: chunkEmbeddings.map((ce) => ({
        ...ce.chunk.metadata,
        version: Number(ce.chunk.metadata.version),
      })),
    });

    // Upsert to SQLite FTS5
    await lexicalIndex.upsertChunks(
      event.productId,
      event.version,
      chunks.map((c) => ({
        id: c.id,
        type: c.type,
        content: c.content,
      }))
    );
  }
}
