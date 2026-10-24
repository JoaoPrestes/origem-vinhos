import { GoogleGenAI, Type } from '@google/genai';
import type {
  RagAiGatewayPort,
  EmbeddingTaskType,
  QueryDecomposition,
  SommelierResponse,
} from '../ports/rag-ai-gateway.port';

export interface GeminiAiAdapterOptions {
  apiKey?: string;
  embeddingModel?: string;
  chatModel?: string;
  client?: GoogleGenAI;
  openRouterApiKey?: string;
  openRouterModel?: string;
  openRouterFetch?: typeof fetch;
  maxGoogleRetries?: number;
  retryBackoffMs?: number;
}

export class GeminiAiAdapter implements RagAiGatewayPort {
  readonly apiKey: string;
  readonly embeddingModel: string;
  readonly chatModel: string;
  readonly embeddingDimensions: number = 768;
  readonly openRouterApiKey: string;
  readonly openRouterModel: string;
  readonly maxGoogleRetries: number;
  private retryBackoffMs: number;
  private openRouterFetch: typeof fetch;
  private client: GoogleGenAI;

  constructor(options: GeminiAiAdapterOptions = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    this.embeddingModel = options.embeddingModel || process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
    this.chatModel = options.chatModel || process.env.GEMINI_CHAT_MODEL || 'gemini-3-flash-preview';
    this.openRouterApiKey = options.openRouterApiKey ?? (process.env.OPENROUTER_API_KEY || '');
    this.openRouterModel = options.openRouterModel || process.env.OPENROUTER_MODEL || 'openrouter/free';
    this.maxGoogleRetries = options.maxGoogleRetries ?? 3;
    this.retryBackoffMs = options.retryBackoffMs ?? 300;
    this.openRouterFetch = options.openRouterFetch ?? fetch.bind(globalThis);

    if (options.client) {
      this.client = options.client;
    } else {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  private async callGenerateContent(params: any): Promise<any> {
    try {
      return await this.client.models.generateContent(params);
    } catch (err: any) {
      // Se o modelo configurado retornar 404 (ex: modelos descontinuados pelo Google), tenta o fallback estável
      const is404 = err?.status === 404 || String(err?.message || '').includes('404') || String(err?.message || '').includes('NOT_FOUND');
      if (is404 && params.model !== 'gemini-3-flash-preview') {
        console.warn(`[GeminiAiAdapter] Modelo ${params.model} indisponível (404). Acionando fallback automático para gemini-3-flash-preview...`);
        return await this.client.models.generateContent({
          ...params,
          model: 'gemini-3-flash-preview',
        });
      }
      throw err;
    }
  }

  private getFreeTierModelList(): string[] {
    const list = [this.openRouterModel];
    const freeCandidates = [
      'openrouter/free',
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
    ];
    for (const model of freeCandidates) {
      if (list.length >= 3) break;
      if (!list.includes(model)) {
        list.push(model);
      }
    }
    return list.slice(0, 3);
  }

  private async callOpenRouter(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada');
    }

    const freeModels = this.getFreeTierModelList();

    const response = await this.openRouterFetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Origem Vinhos Sommelier',
      },
      body: JSON.stringify({
        model: this.openRouterModel,
        models: freeModels,
        messages,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenRouter HTTP ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenRouter retornou resposta sem choices ou content válido');
    }

    return content;
  }

  private extractAndParseJson<T>(rawContent: string): T {
    const trimmed = rawContent.trim();
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch && codeBlockMatch[1]) {
        return JSON.parse(codeBlockMatch[1].trim()) as T;
      }
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      throw new Error(`Não foi possível converter a resposta em JSON: ${trimmed.slice(0, 100)}...`);
    }
  }

  private async executeWithGoogleRetryAndFallback<T>(
    operationName: string,
    googleAction: () => Promise<T>,
    openRouterAction: () => Promise<T>,
    heuristicFallback: () => T
  ): Promise<T> {
    let lastGoogleError: any = null;
    const totalAttempts = 1 + this.maxGoogleRetries;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        return await googleAction();
      } catch (err: any) {
        lastGoogleError = err;
        if (attempt < totalAttempts) {
          const retryNumber = attempt;
          console.warn(
            `[GeminiAiAdapter] Falha na tentativa com Google Gemini (${operationName}): ${err?.message || err}. Iniciando retry ${retryNumber}/${this.maxGoogleRetries}...`
          );
          if (this.retryBackoffMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.retryBackoffMs * retryNumber));
          }
        }
      }
    }

    console.warn(
      `[GeminiAiAdapter] ${this.maxGoogleRetries} retries com Google Gemini esgotados para "${operationName}". Acionando fallback para OpenRouter Free Tier (${this.openRouterModel})...`
    );

    if (this.openRouterApiKey) {
      try {
        const result = await openRouterAction();
        console.log(
          `[GeminiAiAdapter] Fallback para OpenRouter (${this.openRouterModel}) executado com sucesso para "${operationName}".`
        );
        return result;
      } catch (openRouterErr: any) {
        console.error(
          `[GeminiAiAdapter] Falha também no fallback OpenRouter (${operationName}):`,
          openRouterErr?.message || openRouterErr
        );
      }
    } else {
      console.warn(
        `[GeminiAiAdapter] OPENROUTER_API_KEY não configurada. Prosseguindo com fallback heurístico local para "${operationName}".`
      );
    }

    return heuristicFallback();
  }

  async generateEmbeddings(text: string, taskType: EmbeddingTaskType): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: this.embeddingModel,
      contents: text,
      config: {
        outputDimensionality: this.embeddingDimensions,
        taskType,
      },
    });

    const values =
      (response as any).embeddings?.[0]?.values || (response as any).embedding?.values;

    if (!values || !Array.isArray(values)) {
      throw new Error(`Failed to generate embeddings from Gemini API`);
    }

    return values;
  }

  async decomposeQuery(userQuery: string): Promise<QueryDecomposition> {
    const prompt = `Analise a intenção e a consulta do usuário em uma loja de vinhos finos (Origem Vinhos).
Identifique:
1. "semanticQuery": termos focados em perfil sensorial, ocasião, prato para harmonização ou descrição do vinho. Se for apenas conversa, saudação ou dúvida conceitual, deixe como string vazia "".
2. "exactFilters": filtros diretos detectados (categoria como Tinto/Branco/Espumante/Rosé/Sobremesa, maxPrice numérico em reais se houver restrição orçamentária, país ou estilo).
3. "requiresEditorialNotes": true se o usuário pede contexto de safra, vinhedo, produtor ou história de um vinho específico.
4. "isGreetingOrSmallTalk": true se o usuário estiver cumprimentando ("olá", "boa noite", "tudo bem?"), agradecendo, perguntando sobre o assistente ("quem é você?", "o que você pode fazer?", "como você funciona?"), ou fazendo perguntas puramente conceituais/educativas sobre enologia sem pedir para comprar um rótulo específico da loja (ex: "o que é tanino?", "qual a diferença entre Malbec e Cabernet?", "qual a temperatura ideal de serviço?", "como degustar?"). Caso contrário, false.

Consulta do usuário: "${userQuery}"`;

    const googleAction = async () => {
      const response = await this.callGenerateContent({
        model: this.chatModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              semanticQuery: { type: Type.STRING },
              exactFilters: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  maxPrice: { type: Type.NUMBER },
                  country: { type: Type.STRING },
                  style: { type: Type.STRING },
                },
              },
              requiresEditorialNotes: { type: Type.BOOLEAN },
              isGreetingOrSmallTalk: { type: Type.BOOLEAN },
            },
            required: ['semanticQuery', 'exactFilters', 'requiresEditorialNotes', 'isGreetingOrSmallTalk'],
          },
        },
      });

      const rawText = response.text || '{}';
      return this.extractAndParseJson<QueryDecomposition>(rawText);
    };

    const openRouterAction = async () => {
      const messages = [
        {
          role: 'user',
          content: `${prompt}\n\nResponda estritamente com um JSON válido contendo: { "semanticQuery": string, "exactFilters": { "category"?: string, "maxPrice"?: number, "country"?: string, "style"?: string }, "requiresEditorialNotes": boolean, "isGreetingOrSmallTalk": boolean }.`,
        },
      ];
      const raw = await this.callOpenRouter(messages);
      return this.extractAndParseJson<QueryDecomposition>(raw);
    };

    const heuristicFallback = () => {
      const clean = userQuery.trim().toLowerCase();
      const hasGreetingWords = /(^|\b)(ol[aá]|oi|bom dia|boa tarde|boa noite|sauda[cç][oõ]es|obrigad[oa]|valeu|ol[aá] sommelier|tudo bem|tudo bom|e a[ií])(\b|$)/i.test(clean);
      const isConceptualOrSelfQuestion = /(o que (voc[eê]|vc) (pode|sabe)?\s*(fazer|faz)|como (voc[eê]|vc) funciona|quem [eé] (voc[eê]|vc)|como funciona|ajuda|menu|o que [eé]|diferen[cç]a entre|temperatura de servi[cç]o|como degustar|para que serve)/i.test(clean);
      const hasSpecificShoppingIntent = /(quero|comprar|pre[cç]o|quanto custa|recomende|indique|me v[eê]|garrafa|r[óo]tulo|vinho tinto|vinho branco|espumante|ros[eé]|sobremesa)/i.test(clean);

      const isGreetingOrSmallTalk = (hasGreetingWords && !hasSpecificShoppingIntent) || isConceptualOrSelfQuestion;
      return {
        semanticQuery: isGreetingOrSmallTalk ? '' : userQuery,
        exactFilters: {},
        requiresEditorialNotes: false,
        isGreetingOrSmallTalk,
      };
    };

    return this.executeWithGoogleRetryAndFallback(
      'decomposeQuery',
      googleAction,
      openRouterAction,
      heuristicFallback
    );
  }

  async generateSommelierResponse(prompt: {
    systemInstruction: string;
    userQuery: string;
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    ragContext: string;
  }): Promise<SommelierResponse> {
    const fullPrompt = prompt.ragContext
      ? `Contexto Recuperado dos Vinhos Oficiais (RAG):\n${prompt.ragContext}\n\nConsulta do Cliente:\n${prompt.userQuery}`
      : `Consulta do Cliente:\n${prompt.userQuery}`;

    const contents = [
      ...prompt.history,
      {
        role: 'user',
        parts: [{ text: fullPrompt }],
      },
    ];

    const googleAction = async () => {
      const response = await this.callGenerateContent({
        model: this.chatModel,
        contents: contents as any,
        config: {
          systemInstruction: prompt.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Resposta educada, elegante, calorosa e precisa do sommelier.',
              },
              citedProductIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista de IDs únicos dos produtos do catálogo citados ou recomendados na resposta. Deixe vazio [] se for apenas conversa, saudação ou explicação conceitual.',
              },
            },
            required: ['reply', 'citedProductIds'],
          },
        },
      });

      const rawText = response.text || '{}';
      return this.extractAndParseJson<SommelierResponse>(rawText);
    };

    const openRouterAction = async () => {
      const openRouterMessages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: `${prompt.systemInstruction}\n\nIMPORTANTE: Responda SEMPRE em formato JSON com o seguinte esquema:\n{\n  "reply": string,\n  "citedProductIds": string[]\n}`,
        },
      ];

      for (const h of prompt.history) {
        const text = h.parts.map((p) => p.text).join('\n');
        openRouterMessages.push({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: text,
        });
      }

      openRouterMessages.push({
        role: 'user',
        content: `${fullPrompt}\n\nResponda estritamente em formato JSON: { "reply": string, "citedProductIds": string[] }.`,
      });

      const raw = await this.callOpenRouter(openRouterMessages);
      return this.extractAndParseJson<SommelierResponse>(raw);
    };

    const heuristicFallback = () => ({
      reply:
        'Olá! Sou o Sommelier Virtual da Origem Vinhos. Tive uma breve oscilação na consulta à nossa adega digital, mas estou à sua total disposição! Gostaria de conversar sobre harmonizações, tirar dúvidas sobre uvas ou procurar um vinho especial?',
      citedProductIds: [],
    });

    return this.executeWithGoogleRetryAndFallback(
      'generateSommelierResponse',
      googleAction,
      openRouterAction,
      heuristicFallback
    );
  }
}
