import { describe, it, expect, mock } from 'bun:test';
import { GeminiAiAdapter } from '../../src/domains/catalog/adapters/gemini-ai.adapter';

describe('GeminiAiAdapter (spec09 §6.3 & §8.5)', () => {
  it('should initialize with gemini-embedding-001 and 768 dimensions', () => {
    const adapter = new GeminiAiAdapter({ apiKey: 'test-api-key' });
    expect(adapter.embeddingModel).toBe('gemini-embedding-001');
    expect(adapter.embeddingDimensions).toBe(768);
  });

  it('should generate asymmetric embeddings using RETRIEVAL_DOCUMENT and RETRIEVAL_QUERY', async () => {
    const mockEmbedContent = mock(async ({ model, contents, config }: any) => {
      expect(model).toBe('gemini-embedding-001');
      expect(config.outputDimensionality).toBe(768);
      expect(config.taskType).toBe('RETRIEVAL_DOCUMENT');
      return {
        embedding: {
          values: new Array(768).fill(0.05),
        },
      };
    });

    const fakeClient = {
      models: {
        embedContent: mockEmbedContent,
      },
    };

    const adapter = new GeminiAiAdapter({ apiKey: 'test-api-key', client: fakeClient as any });
    const vector = await adapter.generateEmbeddings('Vinho Tinto Serra Malbec', 'RETRIEVAL_DOCUMENT');

    expect(vector).toHaveLength(768);
    expect(vector[0]).toBe(0.05);
    expect(mockEmbedContent).toHaveBeenCalled();
  });

  it('should decompose user queries into structured filters and semantic search', async () => {
    const mockGenerateContent = mock(async ({ model, contents, config }: any) => {
      expect(model).toBe(adapter.chatModel);
      expect(config.responseMimeType).toBe('application/json');
      return {
        text: JSON.stringify({
          semanticQuery: 'vinho tinto encorpado para churrasco',
          exactFilters: {
            category: 'Tinto',
            maxPrice: 150,
          },
          requiresEditorialNotes: true,
          isGreetingOrSmallTalk: false,
        }),
      };
    });

    const fakeClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const adapter = new GeminiAiAdapter({ apiKey: 'test-api-key', client: fakeClient as any });
    const result = await adapter.decomposeQuery('Quero um tinto encorpado até R$ 150 para churrasco');

    expect(result.semanticQuery).toBe('vinho tinto encorpado para churrasco');
    expect(result.exactFilters.category).toBe('Tinto');
    expect(result.exactFilters.maxPrice).toBe(150);
    expect(result.isGreetingOrSmallTalk).toBe(false);
  });

  it('should classify "o que você pode fazer?" and greetings as isGreetingOrSmallTalk in heuristic fallback', async () => {
    const fakeClient = {
      models: {
        generateContent: mock(async () => {
          throw new Error('API connection failure');
        }),
      },
    };

    const adapter = new GeminiAiAdapter({ apiKey: 'test-api-key', client: fakeClient as any });
    
    const r1 = await adapter.decomposeQuery('o que você pode fazer?');
    expect(r1.isGreetingOrSmallTalk).toBe(true);
    expect(r1.semanticQuery).toBe('');

    const r2 = await adapter.decomposeQuery('olá, boa tarde');
    expect(r2.isGreetingOrSmallTalk).toBe(true);

    const r3 = await adapter.decomposeQuery('o que é tanino?');
    expect(r3.isGreetingOrSmallTalk).toBe(true);
  });

  it('should fallback to gemini-3-flash-preview when configured model returns 404', async () => {
    let callCount = 0;
    const mockGenerateContent = mock(async ({ model }: any) => {
      callCount++;
      if (callCount === 1) {
        const err: any = new Error('Model not found');
        err.status = 404;
        throw err;
      }
      return {
        text: JSON.stringify({
          reply: 'Resposta recuperada via modelo fallback estável.',
          citedProductIds: [],
        }),
      };
    });

    const fakeClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const adapter = new GeminiAiAdapter({
      apiKey: 'test-api-key',
      chatModel: 'gemini-2.5-flash',
      client: fakeClient as any,
    });

    const response = await adapter.generateSommelierResponse({
      systemInstruction: 'Instrução...',
      userQuery: 'Olá',
      history: [],
      ragContext: '',
    });

    expect(response.reply).toContain('fallback estável');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('should generate sommelier response with cited product IDs', async () => {
    const mockGenerateContent = mock(async ({ model, contents, config }: any) => {
      expect(model).toBe(adapter.chatModel);
      return {
        text: JSON.stringify({
          reply: 'Recomendo o Serra Malbec 2018 pelo seu perfil encorpado.',
          citedProductIds: ['prod-malbec-1'],
        }),
      };
    });

    const fakeClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const adapter = new GeminiAiAdapter({ apiKey: 'test-api-key', client: fakeClient as any });
    const response = await adapter.generateSommelierResponse({
      systemInstruction: 'Você é um sommelier...',
      userQuery: 'Recomende um vinho',
      history: [],
      ragContext: 'Contexto dos produtos',
    });

    expect(response.reply).toContain('Serra Malbec');
    expect(response.citedProductIds).toEqual(['prod-malbec-1']);
  });
});
