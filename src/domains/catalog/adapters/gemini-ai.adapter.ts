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
}

export class GeminiAiAdapter implements RagAiGatewayPort {
  readonly apiKey: string;
  readonly embeddingModel: string;
  readonly chatModel: string;
  readonly embeddingDimensions: number = 768;
  private client: GoogleGenAI;

  constructor(options: GeminiAiAdapterOptions = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    this.embeddingModel = options.embeddingModel || process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
    this.chatModel = options.chatModel || process.env.GEMINI_CHAT_MODEL || 'gemini-3.8-flash';

    if (options.client) {
      this.client = options.client;
    } else {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
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
1. "semanticQuery": termos focados em perfil sensorial, ocasião, prato para harmonização ou descrição do vinho.
2. "exactFilters": filtros diretos detectados (categoria como Tinto/Branco/Espumante/Rosé, maxPrice numérico em reais se houver restrição orçamentária, país ou estilo).
3. "requiresEditorialNotes": true se o usuário pede contexto de safra, vinhedo, produtor ou história.
4. "isGreetingOrSmallTalk": true se for apenas saudação ou conversa informal sem intenção de vinho.

Consulta do usuário: "${userQuery}"`;

    try {
      const generatePromise = this.client.models.generateContent({
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

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API partial timeout (4s)')), 4000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const rawText = response.text || '{}';
      return JSON.parse(rawText) as QueryDecomposition;
    } catch (err) {
      // Resilient heuristic fallback on API timeout / 503 / network errors (spec09 §8.2 & §10)
      const isGreeting = /^(ol[aá]|oi|bom dia|boa tarde|boa noite|saudações)[\s!,.]*$/i.test(userQuery.trim());
      return {
        semanticQuery: userQuery,
        exactFilters: {},
        requiresEditorialNotes: false,
        isGreetingOrSmallTalk: isGreeting,
      };
    }
  }

  async generateSommelierResponse(prompt: {
    systemInstruction: string;
    userQuery: string;
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    ragContext: string;
  }): Promise<SommelierResponse> {
    const fullPrompt = `Contexto Recuperado dos Vinhos Oficiais (RAG):\n${prompt.ragContext}\n\nConsulta do Cliente:\n${prompt.userQuery}`;

    const contents = [
      ...prompt.history,
      {
        role: 'user',
        parts: [{ text: fullPrompt }],
      },
    ];

    try {
      const generatePromise = this.client.models.generateContent({
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
                description: 'Resposta educada, elegante e precisa do sommelier com base única e estrita nas evidências fornecidas.',
              },
              citedProductIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista de IDs únicos dos produtos do catálogo citados ou recomendados na resposta.',
              },
            },
            required: ['reply', 'citedProductIds'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API partial timeout (4s)')), 4000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const rawText = response.text || '{}';
      return JSON.parse(rawText) as SommelierResponse;
    } catch (err) {
      // Resilient fallback on LLM 503 / timeout
      return {
        reply: 'Selecionei estes rótulos excepcionais da nossa adega especialmente para sua apreciação:',
        citedProductIds: [],
      };
    }
  }
}
