import { describe, it, expect, beforeEach } from 'bun:test';
import { ChromaVectorStoreAdapter } from '../../src/domains/catalog/adapters/chroma-vector-store.adapter';

describe('ChromaVectorStoreAdapter (spec09 §6.3)', () => {
  let mockClient: any;
  let mockCollection: any;
  let memoryStore: Map<string, { id: string; embedding: number[]; document: string; metadata: any }>;

  beforeEach(() => {
    memoryStore = new Map();

    mockCollection = {
      upsert: async (params: { ids: string[]; embeddings: number[][]; documents: string[]; metadatas: any[] }) => {
        params.ids.forEach((id, index) => {
          memoryStore.set(id, {
            id,
            embedding: params.embeddings[index]!,
            document: params.documents[index]!,
            metadata: params.metadatas[index]!,
          });
        });
      },
      query: async (params: { queryEmbeddings: number[][]; nResults: number }) => {
        const records = Array.from(memoryStore.values()).slice(0, params.nResults);
        return {
          ids: [records.map((r) => r.id)],
          distances: [records.map(() => 0.15)],
          documents: [records.map((r) => r.document)],
          metadatas: [records.map((r) => r.metadata)],
        };
      },
      get: async (params?: { ids?: string[]; where?: any }) => {
        let records = Array.from(memoryStore.values());
        if (params?.where?.productId) {
          records = records.filter((r) => r.metadata?.productId === params.where.productId);
        }
        if (params?.ids) {
          records = records.filter((r) => params.ids!.includes(r.id));
        }
        return {
          ids: records.map((r) => r.id),
          metadatas: records.map((r) => r.metadata),
          documents: records.map((r) => r.document),
        };
      },
      delete: async (params: { ids: string[] }) => {
        params.ids.forEach((id) => memoryStore.delete(id));
      },
    };

    mockClient = {
      getOrCreateCollection: async () => mockCollection,
    };
  });

  it('should initialize and perform upsert with 768d vector items', async () => {
    const adapter = new ChromaVectorStoreAdapter({ client: mockClient });

    await adapter.upsert([
      {
        id: 'prod-1_identidade',
        embedding: new Array(768).fill(0.01),
        document: 'Vinho Tinto Serra Malbec 2018',
        metadata: {
          productId: 'prod-1',
          chunkType: 'identidade',
          version: 1,
        },
      },
    ]);

    const result = await adapter.getByProductId('prod-1');
    expect(result.ids.length).toBe(1);
    expect(result.ids[0]).toBe('prod-1_identidade');
    expect(result.metadatas[0]!.version).toBe(1);
  });

  it('should query dense vectors and map results accurately', async () => {
    const adapter = new ChromaVectorStoreAdapter({ client: mockClient });

    await adapter.upsert([
      {
        id: 'prod-1_identidade',
        embedding: new Array(768).fill(0.01),
        document: 'Vinho Tinto Serra Malbec 2018',
        metadata: {
          productId: 'prod-1',
          chunkType: 'identidade',
          version: 1,
        },
      },
    ]);

    const results = await adapter.query(new Array(768).fill(0.01), 5);
    expect(results.length).toBe(1);
    expect(results[0]!.productId).toBe('prod-1');
    expect(results[0]!.distance).toBe(0.15);
  });

  it('should delete by ids and deleteByProductId cleanly', async () => {
    const adapter = new ChromaVectorStoreAdapter({ client: mockClient });

    await adapter.upsert([
      {
        id: 'prod-1_identidade',
        embedding: new Array(768).fill(0.01),
        document: 'Vinho Tinto Serra Malbec 2018',
        metadata: {
          productId: 'prod-1',
          chunkType: 'identidade',
          version: 1,
        },
      },
    ]);

    await adapter.deleteByProductId('prod-1');
    const result = await adapter.getByProductId('prod-1');
    expect(result.ids.length).toBe(0);
  });
});
