import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { ChatOrchestratorUseCase } from '../../src/domains/catalog/use-cases/chat-orchestrator.use-case';
import type { HybridSearchService } from '../../src/domains/catalog/services/hybrid-search.service';
import type { RagAiGatewayPort } from '../../src/domains/catalog/ports/rag-ai-gateway.port';

describe('ChatOrchestratorUseCase (spec09 §8, §10 & BDD Scenarios 3, 9, 12)', () => {
  let mockHybridSearch: HybridSearchService;
  let mockAiGateway: RagAiGatewayPort;
  let mockDb: any;
  let useCase: ChatOrchestratorUseCase;

  beforeEach(() => {
    mockHybridSearch = {
      search: mock(async () => ({
        candidates: [
          { productId: 'p1', score: 0.05, matchedChunks: [] },
          { productId: 'p2', score: 0.03, matchedChunks: [] },
        ],
        mode: 'HYBRID',
      })),
    } as any;

    mockAiGateway = {
      embeddingModel: 'gemini-embedding-001',
      embeddingDimensions: 768,
      generateEmbeddings: mock(async () => []),
      decomposeQuery: mock(async () => ({
        semanticQuery: 'tinto encorpado',
        exactFilters: { category: 'Tinto', maxPrice: 200 },
        requiresEditorialNotes: false,
        isGreetingOrSmallTalk: false,
      })),
      generateSommelierResponse: mock(async () => ({
        reply: 'Recomendo com entusiasmo o Serra Malbec (R$ 179,00).',
        citedProductIds: ['p1'],
      })),
    };

    mockDb = {
      findProductsInFunnel: mock(async () => [
        {
          id: 'p1',
          name: 'Serra Malbec',
          harvest: 2018,
          type: 'Tinto',
          grape: 'Malbec',
          price: 179.0,
          image: '/images/malbec.jpg',
          stock: 4,
          sensory_profile: 'Encorpado e persistente',
          pairing: 'Carnes vermelhas',
          harvest_notes: 'Verão seco e colheita manual',
        },
      ]),
    };

    useCase = new ChatOrchestratorUseCase({
      hybridSearch: mockHybridSearch,
      aiGateway: mockAiGateway,
      db: mockDb,
    });
  });

  it('should sanitize input and handle greeting without querying RAG', async () => {
    mockAiGateway.decomposeQuery = mock(async () => ({
      semanticQuery: '',
      exactFilters: {},
      requiresEditorialNotes: false,
      isGreetingOrSmallTalk: true,
    }));
    mockAiGateway.generateSommelierResponse = mock(async () => ({
      reply: 'Olá! Sou seu Sommelier Virtual. Em que posso auxiliá-lo hoje?',
      citedProductIds: [],
    }));

    const response = await useCase.execute({
      message: 'Olá, boa tarde! <script>alert("hack")</script>',
      history: [],
    });

    expect(response.reply).toContain('Sommelier Virtual');
    expect(response.recommendedProducts).toHaveLength(0);
    expect(mockHybridSearch.search).not.toHaveBeenCalled();
    expect(mockAiGateway.generateSommelierResponse).toHaveBeenCalled();
  });

  it('should handle conversational queries ("o que você pode fazer?") fluidly without returning mini cards', async () => {
    mockAiGateway.decomposeQuery = mock(async () => ({
      semanticQuery: '',
      exactFilters: {},
      requiresEditorialNotes: false,
      isGreetingOrSmallTalk: true,
    }));
    mockAiGateway.generateSommelierResponse = mock(async () => ({
      reply: 'Olá! Como seu Sommelier Virtual, posso tirar dúvidas sobre uvas, sugerir harmonizações e encontrar vinhos da adega. O que gostaria de explorar?',
      citedProductIds: [],
    }));

    const response = await useCase.execute({
      message: 'o que você pode fazer?',
      history: [],
    });

    expect(response.reply).toContain('Sommelier Virtual');
    expect(response.recommendedProducts).toHaveLength(0);
    expect(mockHybridSearch.search).not.toHaveBeenCalled();
  });

  it('should NOT return mini cards when Sommelier does not cite any product in citedProductIds (Ponto 4)', async () => {
    mockAiGateway.decomposeQuery = mock(async () => ({
      semanticQuery: 'vinho',
      exactFilters: {},
      requiresEditorialNotes: false,
      isGreetingOrSmallTalk: false,
    }));
    mockAiGateway.generateSommelierResponse = mock(async () => ({
      reply: 'Temos excelentes opções em nossa adega, mas você prefere tintos ou brancos?',
      citedProductIds: [],
    }));

    const response = await useCase.execute({
      message: 'vocês têm vinhos?',
    });

    expect(response.reply).toContain('você prefere tintos ou brancos?');
    expect(response.recommendedProducts).toHaveLength(0);
  });

  it('Funil da Verdade: discards products with stock = 0 or price > maxPrice (BDD Cenário 3)', async () => {
    // Candidates returned by search: p1 (in stock, $179) and p2 (out of stock)
    mockDb.findProductsInFunnel = mock(async ({ candidateIds, maxPrice }: any) => {
      expect(candidateIds).toContain('p1');
      expect(maxPrice).toBe(200);
      // PostgreSQL query returns only p1 because p2 has stock = 0
      return [
        {
          id: 'p1',
          name: 'Serra Malbec',
          harvest: 2018,
          type: 'Tinto',
          grape: 'Malbec',
          price: 179.0,
          image: '/images/malbec.jpg',
          stock: 4,
          sensory_profile: 'Taninos firmes',
          pairing: 'Churrasco',
          harvest_notes: null,
        },
      ];
    });

    const response = await useCase.execute({
      message: 'Vinho até R$ 200',
    });

    expect(response.recommendedProducts).toHaveLength(1);
    expect(response.recommendedProducts[0]!.id).toBe('p1');
    expect(response.recommendedProducts[0]!.stock).toBe(4);
  });

  it('Post-Generation Grounding Check: intercepts hallucinated price and restores official PG price (BDD Cenário 9)', async () => {
    // Model hallucinates price R$ 50,00 when official Postgres price is 179.00
    mockAiGateway.generateSommelierResponse = mock(async () => ({
      reply: 'Excelente escolha! O Serra Malbec custa apenas R$ 50,00 na promoção.',
      citedProductIds: ['p1'],
    }));

    const response = await useCase.execute({
      message: 'Qual o valor do Serra Malbec?',
    });

    // Grounding check replaces hallucinated price with official R$ 179,00
    expect(response.reply).toContain('179,00');
    expect(response.reply).not.toContain('50,00');
    // Mini Card is 100% sovereign from Postgres
    expect(response.recommendedProducts[0]!.price).toBe(179.0);
  });

  it('Post-Generation Grounding Check: purges citedProductIds not approved by Funnel of Truth', async () => {
    mockAiGateway.generateSommelierResponse = mock(async () => ({
      reply: 'Recomendo estes dois rótulos.',
      citedProductIds: ['p1', 'fake-hallucinated-id'],
    }));

    const response = await useCase.execute({
      message: 'Recomende vinhos',
    });

    expect(response.recommendedProducts).toHaveLength(1);
    expect(response.recommendedProducts[0]!.id).toBe('p1');
  });

  it('Global Deadline: respects 18s timeout via AbortController (BDD Cenário 12)', async () => {
    const hangingUseCase = new ChatOrchestratorUseCase({
      hybridSearch: {
        search: async () => {
          await Bun.sleep(200);
          return { candidates: [], mode: 'HYBRID' };
        },
      } as any,
      aiGateway: mockAiGateway,
      db: mockDb,
      timeoutMs: 50, // fast timeout for test
    });

    expect(hangingUseCase.execute({ message: 'Olá' })).rejects.toThrow('Chat operation timed out');
  });
});
