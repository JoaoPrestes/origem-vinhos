import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { HybridSearchService } from '../../src/domains/catalog/services/hybrid-search.service';
import type { RagVectorStorePort } from '../../src/domains/catalog/ports/rag-vector-store.port';
import type { RagLexicalIndexPort } from '../../src/domains/catalog/ports/rag-lexical-index.port';
import type { RagAiGatewayPort } from '../../src/domains/catalog/ports/rag-ai-gateway.port';

describe('HybridSearchService (spec09 §7.1, §7.2 & BDD Cenário 5)', () => {
  let mockVectorStore: RagVectorStorePort;
  let mockLexicalIndex: RagLexicalIndexPort;
  let mockAiGateway: RagAiGatewayPort;

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
      generateEmbeddings: mock(async () => new Array(768).fill(0.01)),
      decomposeQuery: mock(async () => ({} as any)),
      generateSommelierResponse: mock(async () => ({} as any)),
    };
  });

  it('should fuse vector and lexical results using RRF (k=60)', async () => {
    mockVectorStore.query = mock(async () => [
      {
        id: 'p1_identidade',
        productId: 'p1',
        chunkType: 'identidade',
        distance: 0.1,
        document: 'Vinho Tinto P1',
        metadata: { productId: 'p1', version: 1, chunkType: 'identidade' },
      },
      {
        id: 'p2_identidade',
        productId: 'p2',
        chunkType: 'identidade',
        distance: 0.2,
        document: 'Vinho Tinto P2',
        metadata: { productId: 'p2', version: 1, chunkType: 'identidade' },
      },
    ]);

    mockLexicalIndex.query = mock(async () => [
      {
        chunkId: 'p2_sensorial',
        productId: 'p2',
        chunkType: 'sensorial',
        version: 1,
        score: -5.0,
      },
      {
        chunkId: 'p3_identidade',
        productId: 'p3',
        chunkType: 'identidade',
        version: 1,
        score: -4.0,
      },
    ]);

    const service = new HybridSearchService({
      vectorStore: mockVectorStore,
      lexicalIndex: mockLexicalIndex,
      aiGateway: mockAiGateway,
    });

    const result = await service.search('vinho encorpado', 5);

    expect(result.mode).toBe('HYBRID');
    expect(result.candidates.length).toBeGreaterThan(0);

    // p2 appeared in both (vector rank 2: 1/(60+2) + bm25 rank 1: 1/(60+1) => ~0.0161 + ~0.01639 = ~0.0325)
    // p1 appeared in vector rank 1: 1/(60+1) = ~0.01639
    // p2 should have the highest fused score!
    expect(result.candidates[0].productId).toBe('p2');
    expect(result.candidates[0].score).toBeGreaterThan(result.candidates[1].score);
  });

  it('should fallback to BM25_ONLY if ChromaDB fails (BDD Cenário 5)', async () => {
    mockVectorStore.query = mock(async () => {
      throw new Error('ChromaDB connection refused');
    });

    mockLexicalIndex.query = mock(async () => [
      {
        chunkId: 'p3_identidade',
        productId: 'p3',
        chunkType: 'identidade',
        version: 1,
        score: -3.5,
      },
    ]);

    const service = new HybridSearchService({
      vectorStore: mockVectorStore,
      lexicalIndex: mockLexicalIndex,
      aiGateway: mockAiGateway,
    });

    const result = await service.search('cabernet', 5);

    expect(result.mode).toBe('BM25_ONLY');
    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].productId).toBe('p3');
  });

  it('should fallback to CHROMA_ONLY if SQLite lexical search fails', async () => {
    mockVectorStore.query = mock(async () => [
      {
        id: 'p4_identidade',
        productId: 'p4',
        chunkType: 'identidade',
        distance: 0.15,
        document: 'Vinho Branco P4',
        metadata: { productId: 'p4', version: 1, chunkType: 'identidade' },
      },
    ]);

    mockLexicalIndex.query = mock(async () => {
      throw new Error('SQLite busy / locked');
    });

    const service = new HybridSearchService({
      vectorStore: mockVectorStore,
      lexicalIndex: mockLexicalIndex,
      aiGateway: mockAiGateway,
    });

    const result = await service.search('chardonnay', 5);

    expect(result.mode).toBe('CHROMA_ONLY');
    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].productId).toBe('p4');
  });
});
