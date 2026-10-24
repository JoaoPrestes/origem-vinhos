import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { ProcessCatalogOutboxUseCase } from '../../src/domains/catalog/use-cases/process-catalog-outbox.use-case';
import type { RagVectorStorePort } from '../../src/domains/catalog/ports/rag-vector-store.port';
import type { RagLexicalIndexPort } from '../../src/domains/catalog/ports/rag-lexical-index.port';
import type { RagAiGatewayPort } from '../../src/domains/catalog/ports/rag-ai-gateway.port';

describe('ProcessCatalogOutboxUseCase (spec09 §6.1, §6.3, §10.2 & BDD Cenário 13)', () => {
  let mockVectorStore: RagVectorStorePort;
  let mockLexicalIndex: RagLexicalIndexPort;
  let mockAiGateway: RagAiGatewayPort;
  let mockDb: any;
  let useCase: ProcessCatalogOutboxUseCase;

  beforeEach(() => {
    mockVectorStore = {
      upsert: mock(async () => {}),
      query: mock(async () => []),
      delete: mock(async () => {}),
      deleteByProductId: mock(async () => {}),
      getByProductId: mock(async () => ({ ids: [], metadatas: [], documents: [] })),
      getAllRecords: mock(async () => ({ ids: [], metadatas: [], documents: [] })),
    };

    mockLexicalIndex = {
      upsertChunks: mock(async () => {}),
      query: mock(async () => []),
      deleteByProductId: mock(async () => {}),
      deleteProductChunks: mock(async () => {}),
      getVersion: mock(async () => null),
      rebuildInPlace: mock(async () => {}),
      getAllVersions: mock(async () => []),
      close: mock(async () => {}),
    };

    mockAiGateway = {
      embeddingModel: 'gemini-embedding-001',
      embeddingDimensions: 768,
      generateEmbeddings: mock(async () => new Array(768).fill(0.1)),
      decomposeQuery: mock(async () => ({} as any)),
      generateSommelierResponse: mock(async () => ({} as any)),
    };
  });

  it('should process pending PRODUCT_CREATED event, generate embeddings, and index in Chroma + SQLite', async () => {
    const fakeProduct = {
      id: 'prod-001',
      name: 'Vinho Tinto Reserva',
      type: 'Tinto',
      grape: 'Cabernet',
      country: 'Brasil',
      harvest: 2021,
      alcohol: 13.5,
      description: 'Elegante e encorpado.',
      stock: 20,
      version: 1,
      status: 'ACTIVE',
      sensory_profile: null,
      pairing: null,
      harvest_notes: null,
    };

    const claimedEvents = [
      {
        id: 'event-1',
        productId: 'prod-001',
        eventType: 'PRODUCT_CREATED',
        version: 1,
        status: 'PROCESSING',
        retryCount: 0,
      },
    ];

    mockDb = {
      claimPendingEvents: mock(async () => claimedEvents),
      findProductById: mock(async () => fakeProduct),
      markEventProcessed: mock(async () => {}),
      markEventFailed: mock(async () => {}),
    };

    useCase = new ProcessCatalogOutboxUseCase({
      db: mockDb,
      vectorStore: mockVectorStore,
      lexicalIndex: mockLexicalIndex,
      aiGateway: mockAiGateway,
    });

    const result = await useCase.executeBatch(10);
    expect(result.processed).toBe(1);
    expect(mockAiGateway.generateEmbeddings).toHaveBeenCalled();
    expect(mockVectorStore.upsert).toHaveBeenCalled();
    expect(mockLexicalIndex.upsertChunks).toHaveBeenCalled();
    expect(mockDb.markEventProcessed).toHaveBeenCalledWith('event-1');
  });

  it('should preserve existing chunks if AI embedding generation fails (BDD Cenário 13)', async () => {
    const fakeProduct = {
      id: 'prod-002',
      name: 'Vinho Merlot',
      type: 'Tinto',
      grape: 'Merlot',
      country: 'Brasil',
      harvest: 2020,
      alcohol: 13,
      description: 'Frutado.',
      stock: 10,
      version: 2,
      status: 'ACTIVE',
    };

    const claimedEvents = [
      {
        id: 'event-2',
        productId: 'prod-002',
        eventType: 'PRODUCT_UPDATED',
        version: 2,
        status: 'PROCESSING',
        retryCount: 1,
      },
    ];

    mockAiGateway.generateEmbeddings = mock(async () => {
      throw new Error('Gemini API 503 Service Unavailable');
    });

    mockDb = {
      claimPendingEvents: mock(async () => claimedEvents),
      findProductById: mock(async () => fakeProduct),
      markEventProcessed: mock(async () => {}),
      markEventFailed: mock(async () => {}),
    };

    useCase = new ProcessCatalogOutboxUseCase({
      db: mockDb,
      vectorStore: mockVectorStore,
      lexicalIndex: mockLexicalIndex,
      aiGateway: mockAiGateway,
    });

    const result = await useCase.executeBatch(10);
    expect(result.failed).toBe(1);
    // CRITICAL: delete must NOT be called before embeddings succeed!
    expect(mockVectorStore.deleteByProductId).not.toHaveBeenCalled();
    expect(mockLexicalIndex.deleteByProductId).not.toHaveBeenCalled();
    expect(mockDb.markEventFailed).toHaveBeenCalledWith('event-2', 'Gemini API 503 Service Unavailable');
  });

  it('should skip reindexing and mark PROCESSED if dual version guard detects consistency', async () => {
    const fakeProduct = {
      id: 'prod-003',
      name: 'Vinho Syrah',
      type: 'Tinto',
      grape: 'Syrah',
      country: 'Brasil',
      harvest: 2021,
      alcohol: 14,
      description: 'Notas de especiarias.',
      stock: 15,
      version: 1,
      status: 'ACTIVE',
      sensory_profile: null,
      pairing: null,
      harvest_notes: null,
    };

    // Vector store already has 1 chunk at version 1
    mockVectorStore.getByProductId = mock(async () => ({
      ids: ['prod-003_identidade'],
      metadatas: [{ productId: 'prod-003', version: 1, chunkType: 'identidade' }],
      documents: ['Texto do vinho'],
    }));

    // Lexical index already has version 1
    mockLexicalIndex.getVersion = mock(async () => 1);

    const claimedEvents = [
      {
        id: 'event-3',
        productId: 'prod-003',
        eventType: 'PRODUCT_UPDATED',
        version: 1,
        status: 'PROCESSING',
        retryCount: 0,
      },
    ];

    mockDb = {
      claimPendingEvents: mock(async () => claimedEvents),
      findProductById: mock(async () => fakeProduct),
      markEventProcessed: mock(async () => {}),
      markEventFailed: mock(async () => {}),
    };

    useCase = new ProcessCatalogOutboxUseCase({
      db: mockDb,
      vectorStore: mockVectorStore,
      lexicalIndex: mockLexicalIndex,
      aiGateway: mockAiGateway,
    });

    const result = await useCase.executeBatch(10);
    expect(result.processed).toBe(1);
    // Should NOT have generated embeddings since it's already consistent
    expect(mockAiGateway.generateEmbeddings).not.toHaveBeenCalled();
    expect(mockDb.markEventProcessed).toHaveBeenCalledWith('event-3');
  });
});
