import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { ReconcileRagIndexesUseCase } from '../../src/domains/catalog/use-cases/reconcile-rag-indexes.use-case';
import type { RagVectorStorePort, VectorChunkMetadata } from '../../src/domains/catalog/ports/rag-vector-store.port';
import type { RagLexicalIndexPort } from '../../src/domains/catalog/ports/rag-lexical-index.port';
import type { RagAiGatewayPort } from '../../src/domains/catalog/ports/rag-ai-gateway.port';

describe('ReconcileRagIndexesUseCase (spec09 §10.3)', () => {
  let mockVectorStore: RagVectorStorePort;
  let mockLexicalIndex: RagLexicalIndexPort;
  let mockAiGateway: RagAiGatewayPort;
  let mockDb: any;

  beforeEach(() => {
    mockVectorStore = {
      upsert: mock(async () => {}),
      query: mock(async () => []),
      delete: mock(async () => {}),
      deleteByProductId: mock(async () => {}),
      getByProductId: mock(async () => ({ ids: [], metadatas: [], documents: [] })),
      getAllRecords: mock(async () => ({ ids: [], metadatas: [] })),
    };

    mockLexicalIndex = {
      upsertChunks: mock(async () => {}),
      deleteProductChunks: mock(async () => {}),
      deleteByProductId: mock(async () => {}),
      query: mock(async () => []),
      getVersion: mock(async () => null),
      getAllVersions: mock(async () => []),
      rebuildInPlace: mock(async () => {}),
      close: mock(() => {}),
    };

    mockAiGateway = {
      embeddingModel: 'gemini-embedding-001',
      embeddingDimensions: 768,
      generateEmbeddings: mock(async () => new Array(768).fill(0.1)),
      decomposeQuery: mock(async () => ({} as any)),
      generateSommelierResponse: mock(async () => ({} as any)),
    };
  });

  it('Case 4: should do nothing (0 AI calls) when versions and chunks are fully consistent', async () => {
    const activeProducts = [
      {
        id: 'p1',
        name: 'Vinho Tinto',
        type: 'Tinto',
        grape: 'Cabernet',
        country: 'Brasil',
        harvest: 2020,
        alcohol: 13,
        description: 'Bom vinho.',
        stock: 10,
        version: 1,
        status: 'ACTIVE',
        sensory_profile: null,
        pairing: null,
        harvest_notes: null,
      },
    ];

    mockDb = {
      getAllActiveProducts: mock(async () => activeProducts),
    };

    mockVectorStore.getAllRecords = mock(async () => ({
      ids: ['p1_identidade'],
      metadatas: [{ productId: 'p1', version: 1, chunkType: 'identidade' } as VectorChunkMetadata],
    }));

    mockLexicalIndex.getAllVersions = mock(async () => [{ productId: 'p1', version: 1 }]);

    const useCase = new ReconcileRagIndexesUseCase({
      db: mockDb,
      vectorStore: mockVectorStore,
      lexicalIndex: mockLexicalIndex,
      aiGateway: mockAiGateway,
    });

    const report = await useCase.execute();
    expect(report.syncedCount).toBe(0);
    expect(report.orphanCleanedCount).toBe(0);
    expect(report.consistentCount).toBe(1);
    expect(mockAiGateway.generateEmbeddings).not.toHaveBeenCalled();
  });

  it('Case 1: should re-index when PG version is newer than Chroma or SQLite', async () => {
    const activeProducts = [
      {
        id: 'p2',
        name: 'Vinho Merlot',
        type: 'Tinto',
        grape: 'Merlot',
        country: 'Brasil',
        harvest: 2021,
        alcohol: 13.5,
        description: 'Frutado.',
        stock: 10,
        version: 3,
        status: 'ACTIVE',
        sensory_profile: null,
        pairing: null,
        harvest_notes: null,
      },
    ];

    mockDb = {
      getAllActiveProducts: mock(async () => activeProducts),
    };

    mockVectorStore.getAllRecords = mock(async () => ({
      ids: ['p2_identidade'],
      metadatas: [{ productId: 'p2', version: 2, chunkType: 'identidade' } as VectorChunkMetadata], // Outdated!
    }));

    mockLexicalIndex.getAllVersions = mock(async () => [{ productId: 'p2', version: 2 }]);

    const useCase = new ReconcileRagIndexesUseCase({
      db: mockDb,
      vectorStore: mockVectorStore,
      lexicalIndex: mockLexicalIndex,
      aiGateway: mockAiGateway,
    });

    const report = await useCase.execute();
    expect(report.syncedCount).toBe(1);
    expect(mockAiGateway.generateEmbeddings).toHaveBeenCalled();
    expect(mockVectorStore.upsert).toHaveBeenCalled();
    expect(mockLexicalIndex.upsertChunks).toHaveBeenCalled();
  });

  it('Case 2: should clean orphan chunks from Chroma and SQLite for deleted or inactive products', async () => {
    mockDb = {
      getAllActiveProducts: mock(async () => []), // No active products in PG
    };

    mockVectorStore.getAllRecords = mock(async () => ({
      ids: ['orphan-prod_identidade'],
      metadatas: [{ productId: 'orphan-prod', version: 1, chunkType: 'identidade' } as VectorChunkMetadata],
    }));

    mockLexicalIndex.getAllVersions = mock(async () => [{ productId: 'orphan-prod', version: 1 }]);

    const useCase = new ReconcileRagIndexesUseCase({
      db: mockDb,
      vectorStore: mockVectorStore,
      lexicalIndex: mockLexicalIndex,
      aiGateway: mockAiGateway,
    });

    const report = await useCase.execute();
    expect(report.orphanCleanedCount).toBe(1);
    expect(mockVectorStore.deleteByProductId).toHaveBeenCalledWith('orphan-prod');
    expect(mockLexicalIndex.deleteByProductId).toHaveBeenCalledWith('orphan-prod');
  });

  it('Case 3: should re-index when missing in one store (partial failure)', async () => {
    const activeProducts = [
      {
        id: 'p3',
        name: 'Vinho Branco',
        type: 'Branco',
        grape: 'Chardonnay',
        country: 'Brasil',
        harvest: 2022,
        alcohol: 12.5,
        description: 'Fresco.',
        stock: 5,
        version: 1,
        status: 'ACTIVE',
        sensory_profile: null,
        pairing: null,
        harvest_notes: null,
      },
    ];

    mockDb = {
      getAllActiveProducts: mock(async () => activeProducts),
    };

    // Exists in SQLite but NOT in Chroma
    mockVectorStore.getAllRecords = mock(async () => ({
      ids: [],
      metadatas: [],
    }));

    mockLexicalIndex.getAllVersions = mock(async () => [{ productId: 'p3', version: 1 }]);

    const useCase = new ReconcileRagIndexesUseCase({
      db: mockDb,
      vectorStore: mockVectorStore,
      lexicalIndex: mockLexicalIndex,
      aiGateway: mockAiGateway,
    });

    const report = await useCase.execute();
    expect(report.syncedCount).toBe(1);
    expect(mockAiGateway.generateEmbeddings).toHaveBeenCalled();
  });
});
