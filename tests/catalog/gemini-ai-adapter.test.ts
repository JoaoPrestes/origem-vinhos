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

    const adapter = new GeminiAiAdapter({
      apiKey: 'test-api-key',
      client: fakeClient as any,
      openRouterApiKey: '',
      retryBackoffMs: 1,
    });
    
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

  it('should retry 3 times on Google Gemini error and fallback to OpenRouter free models for decomposeQuery', async () => {
    let googleAttempts = 0;
    const fakeClient = {
      models: {
        generateContent: mock(async () => {
          googleAttempts++;
          throw new Error('Google Gemini rate limit 429');
        }),
      },
    };

    let openRouterCalled = false;
    let openRouterBody: any = null;
    const mockOpenRouterFetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      openRouterCalled = true;
      openRouterBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  semanticQuery: 'vinho tinto encorpado',
                  exactFilters: { category: 'Tinto', maxPrice: 120 },
                  requiresEditorialNotes: false,
                  isGreetingOrSmallTalk: false,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const adapter = new GeminiAiAdapter({
      apiKey: 'test-api-key',
      client: fakeClient as any,
      openRouterApiKey: 'test-openrouter-key',
      openRouterModel: 'openrouter/free',
      openRouterFetch: mockOpenRouterFetch as any,
      retryBackoffMs: 1,
    });

    const result = await adapter.decomposeQuery('Quero um tinto até 120');

    expect(googleAttempts).toBe(4); // 1 inicial + 3 retries
    expect(openRouterCalled).toBe(true);
    expect(openRouterBody.model).toBe('openrouter/free');
    expect(openRouterBody.models).toContain('openrouter/free');
    expect(result.semanticQuery).toBe('vinho tinto encorpado');
    expect(result.exactFilters.category).toBe('Tinto');
    expect(result.exactFilters.maxPrice).toBe(120);
  });

  it('should retry 3 times on Google Gemini error and fallback to OpenRouter free models for generateSommelierResponse', async () => {
    let googleAttempts = 0;
    const fakeClient = {
      models: {
        generateContent: mock(async () => {
          googleAttempts++;
          throw new Error('Google Gemini quota exceeded');
        }),
      },
    };

    let openRouterCalled = false;
    const mockOpenRouterFetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      openRouterCalled = true;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  reply: 'Resposta servida com maestria pelo fallback do OpenRouter.',
                  citedProductIds: ['prod-or-1'],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const adapter = new GeminiAiAdapter({
      apiKey: 'test-api-key',
      client: fakeClient as any,
      openRouterApiKey: 'test-openrouter-key',
      openRouterFetch: mockOpenRouterFetch as any,
      retryBackoffMs: 1,
    });

    const response = await adapter.generateSommelierResponse({
      systemInstruction: 'Você é um sommelier...',
      userQuery: 'Recomende um vinho',
      history: [],
      ragContext: 'Contexto dos vinhos',
    });

    expect(googleAttempts).toBe(4); // 1 inicial + 3 retries
    expect(openRouterCalled).toBe(true);
    expect(response.reply).toContain('fallback do OpenRouter');
    expect(response.citedProductIds).toEqual(['prod-or-1']);
  });

  it('should succeed if Google Gemini recovers on a retry before reaching OpenRouter', async () => {
    let googleAttempts = 0;
    const fakeClient = {
      models: {
        generateContent: mock(async () => {
          googleAttempts++;
          if (googleAttempts < 3) {
            throw new Error('Temporary 503');
          }
          return {
            text: JSON.stringify({
              reply: 'Recuperado com sucesso no segundo retry da Google API.',
              citedProductIds: [],
            }),
          };
        }),
      },
    };

    let openRouterCalled = false;
    const mockOpenRouterFetch = mock(async () => {
      openRouterCalled = true;
      return new Response('{}', { status: 200 });
    });

    const adapter = new GeminiAiAdapter({
      apiKey: 'test-api-key',
      client: fakeClient as any,
      openRouterApiKey: 'test-openrouter-key',
      openRouterFetch: mockOpenRouterFetch as any,
      retryBackoffMs: 1,
    });

    const response = await adapter.generateSommelierResponse({
      systemInstruction: 'Instrução...',
      userQuery: 'Olá',
      history: [],
      ragContext: '',
    });

    expect(googleAttempts).toBe(3); // Inicial (1) + retry 1 (2) + retry 2 (3, sucesso)
    expect(openRouterCalled).toBe(false);
    expect(response.reply).toContain('segundo retry da Google API');
  });

  it('should degrade gracefully to local heuristic if both Google (after 3 retries) and OpenRouter fail', async () => {
    const fakeClient = {
      models: {
        generateContent: mock(async () => {
          throw new Error('Google down');
        }),
      },
    };

    const mockOpenRouterFetch = mock(async () => {
      throw new Error('OpenRouter network down');
    });

    const adapter = new GeminiAiAdapter({
      apiKey: 'test-api-key',
      client: fakeClient as any,
      openRouterApiKey: 'test-openrouter-key',
      openRouterFetch: mockOpenRouterFetch as any,
      retryBackoffMs: 1,
    });

    const response = await adapter.generateSommelierResponse({
      systemInstruction: 'Instrução...',
      userQuery: 'Olá',
      history: [],
      ragContext: '',
    });

    expect(response.reply).toContain('Sommelier Virtual da Origem Vinhos');
    expect(response.citedProductIds).toEqual([]);
  });
});
