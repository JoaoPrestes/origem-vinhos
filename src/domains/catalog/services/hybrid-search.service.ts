import type { RagVectorStorePort, VectorQueryResult } from '../ports/rag-vector-store.port';
import type { RagLexicalIndexPort, LexicalQueryResult } from '../ports/rag-lexical-index.port';
import type { RagAiGatewayPort } from '../ports/rag-ai-gateway.port';

export interface CandidateProduct {
  productId: string;
  score: number;
  denseRank?: number;
  lexicalRank?: number;
  matchedChunks: Array<{
    id: string;
    type: string;
    document?: string;
  }>;
}

export interface HybridSearchResult {
  candidates: CandidateProduct[];
  mode: 'HYBRID' | 'BM25_ONLY' | 'CHROMA_ONLY' | 'FAILED';
}

export interface HybridSearchServiceOptions {
  vectorStore: RagVectorStorePort;
  lexicalIndex: RagLexicalIndexPort;
  aiGateway: RagAiGatewayPort;
  k?: number; // RRF constant, default 60
}

export class HybridSearchService {
  private vectorStore: RagVectorStorePort;
  private lexicalIndex: RagLexicalIndexPort;
  private aiGateway: RagAiGatewayPort;
  private k: number;

  constructor(options: HybridSearchServiceOptions) {
    this.vectorStore = options.vectorStore;
    this.lexicalIndex = options.lexicalIndex;
    this.aiGateway = options.aiGateway;
    this.k = options.k ?? 60;
  }

  async search(query: string, topK: number = 8): Promise<HybridSearchResult> {
    const fetchDense = async (): Promise<VectorQueryResult[]> => {
      const queryVector = await this.aiGateway.generateEmbeddings(query, 'RETRIEVAL_QUERY');
      return await this.vectorStore.query(queryVector, 15);
    };

    const fetchLexical = async (): Promise<LexicalQueryResult[]> => {
      return await this.lexicalIndex.query(query, 15);
    };

    const [denseResult, lexicalResult] = await Promise.allSettled([
      fetchDense(),
      fetchLexical(),
    ]);

    const isDenseSuccess = denseResult.status === 'fulfilled';
    const isLexicalSuccess = lexicalResult.status === 'fulfilled';

    let mode: 'HYBRID' | 'BM25_ONLY' | 'CHROMA_ONLY' | 'FAILED';

    if (isDenseSuccess && isLexicalSuccess) {
      mode = 'HYBRID';
    } else if (isLexicalSuccess) {
      mode = 'BM25_ONLY';
    } else if (isDenseSuccess) {
      mode = 'CHROMA_ONLY';
    } else {
      mode = 'FAILED';
      return { candidates: [], mode };
    }

    const denseItems: VectorQueryResult[] = isDenseSuccess ? denseResult.value : [];
    const lexicalItems: LexicalQueryResult[] = isLexicalSuccess ? lexicalResult.value : [];

    // Map: productId -> CandidateProduct
    const candidatesMap = new Map<string, CandidateProduct>();

    // 1. Process Dense Items (rank: 1-indexed)
    for (let i = 0; i < denseItems.length; i++) {
      const item = denseItems[i];
      if (!item) continue;
      const rank = i + 1;
      const rrf = 1 / (this.k + rank);

      const candidate = candidatesMap.get(item.productId) || {
        productId: item.productId,
        score: 0,
        denseRank: rank,
        matchedChunks: [],
      };

      candidate.score += rrf;
      if (!candidate.denseRank || rank < candidate.denseRank) {
        candidate.denseRank = rank;
      }
      candidate.matchedChunks.push({
        id: item.id,
        type: item.chunkType,
        document: item.document,
      });

      candidatesMap.set(item.productId, candidate);
    }

    // 2. Process Lexical Items (rank: 1-indexed)
    for (let j = 0; j < lexicalItems.length; j++) {
      const item = lexicalItems[j];
      if (!item) continue;
      const rank = j + 1;
      const rrf = 1 / (this.k + rank);

      const candidate = candidatesMap.get(item.productId) || {
        productId: item.productId,
        score: 0,
        lexicalRank: rank,
        matchedChunks: [],
      };

      candidate.score += rrf;
      if (!candidate.lexicalRank || rank < candidate.lexicalRank) {
        candidate.lexicalRank = rank;
      }
      candidate.matchedChunks.push({
        id: item.chunkId,
        type: item.chunkType,
      });

      candidatesMap.set(item.productId, candidate);
    }

    // Sort by descending fused score
    const sorted = Array.from(candidatesMap.values()).sort((a, b) => b.score - a.score);

    return {
      candidates: sorted.slice(0, topK),
      mode,
    };
  }
}
