import { ChromaClient, type Collection } from 'chromadb';
import type {
  RagVectorStorePort,
  VectorChunkItem,
  VectorQueryResult,
  VectorChunkMetadata,
} from '../ports/rag-vector-store.port';

export interface ChromaVectorStoreAdapterOptions {
  client?: ChromaClient;
  collectionName?: string;
  url?: string;
}

export class ChromaVectorStoreAdapter implements RagVectorStorePort {
  private client: ChromaClient;
  private collectionName: string;
  private collectionPromise: Promise<Collection> | null = null;

  constructor(options?: ChromaVectorStoreAdapterOptions) {
    this.client = options?.client ?? new ChromaClient({
      path: options?.url || process.env.CHROMA_URL || 'http://localhost:8000',
    });
    this.collectionName = options?.collectionName || 'origem_vinhos_catalog';
  }

  private async getCollection(): Promise<Collection> {
    if (!this.collectionPromise) {
      this.collectionPromise = this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { 'hnsw:space': 'cosine' },
      });
    }
    return await this.collectionPromise;
  }

  async upsert(chunks: VectorChunkItem[]): Promise<void> {
    if (chunks.length === 0) return;

    const collection = await this.getCollection();
    await collection.upsert({
      ids: chunks.map((c) => c.id),
      embeddings: chunks.map((c) => c.embedding),
      documents: chunks.map((c) => c.document),
      metadatas: chunks.map((c) => ({
        ...c.metadata,
        productId: c.metadata.productId,
        chunkType: c.metadata.chunkType,
        version: c.metadata.version,
      })),
    });
  }

  async query(queryEmbedding: number[], nResults: number = 8): Promise<VectorQueryResult[]> {
    const collection = await this.getCollection();
    const response = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
    });

    const results: VectorQueryResult[] = [];
    const ids = response.ids[0] || [];
    const distances = response.distances?.[0] || [];
    const documents = response.documents[0] || [];
    const metadatas = response.metadatas[0] || [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const metadata = (metadatas[i] || {}) as VectorChunkMetadata;
      const distance = distances[i] ?? 0;
      const document = documents[i] || '';

      results.push({
        id,
        productId: metadata.productId || '',
        chunkType: metadata.chunkType || '',
        distance: Number(distance),
        document,
        metadata,
      });
    }

    return results;
  }

  async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const collection = await this.getCollection();
    await collection.delete({ ids });
  }

  async deleteByProductId(productId: string): Promise<void> {
    const existing = await this.getByProductId(productId);
    if (existing.ids.length > 0) {
      await this.delete(existing.ids);
    }
  }

  async getByProductId(productId: string): Promise<{
    ids: string[];
    metadatas: VectorChunkMetadata[];
    documents: string[];
  }> {
    const collection = await this.getCollection();
    const records = await collection.get({
      where: { productId },
    });

    return {
      ids: records.ids || [],
      metadatas: ((records.metadatas || []) as unknown) as VectorChunkMetadata[],
      documents: ((records.documents || []).filter((d): d is string => typeof d === 'string')) as string[],
    };
  }

  async getAllRecords(): Promise<{
    ids: string[];
    metadatas: VectorChunkMetadata[];
  }> {
    const collection = await this.getCollection();
    const records = await collection.get();

    return {
      ids: records.ids || [],
      metadatas: ((records.metadatas || []) as unknown) as VectorChunkMetadata[],
    };
  }
}
