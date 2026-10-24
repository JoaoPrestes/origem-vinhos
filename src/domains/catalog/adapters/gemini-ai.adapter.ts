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
    this.chatModel = options.chatModel || process.env.GEMINI_CHAT_MODEL || 'gemini-3-flash-preview';

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

    try {
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
      return JSON.parse(rawText) as QueryDecomposition;
    } catch (err) {
      console.error('[GeminiAiAdapter] Erro na decomposição de query com Gemini API:', err);
      // Heurística de fallback resiliente cobrindo saudações e dúvidas conversacionais
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
    }
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

    try {
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
      return JSON.parse(rawText) as SommelierResponse;
    } catch (err) {
      console.error('[GeminiAiAdapter] Erro na chamada ao Gemini API ao gerar resposta do sommelier:', err);
      // Fallback conversacional elegante e acolhedor (sem mensagens fixas de seleção de rótulos)
      return {
        reply:
          'Olá! Sou o Sommelier Virtual da Origem Vinhos. Tive uma breve oscilação na consulta à nossa adega digital, mas estou à sua total disposição! Gostaria de conversar sobre harmonizações, tirar dúvidas sobre uvas ou procurar um vinho especial?',
        citedProductIds: [],
      };
    }
  }
}
