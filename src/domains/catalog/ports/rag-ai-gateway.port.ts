export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export interface QueryDecomposition {
  semanticQuery: string;
  exactFilters: {
    category?: string;
    maxPrice?: number;
    country?: string;
    style?: string;
  };
  requiresEditorialNotes: boolean;
  isGreetingOrSmallTalk: boolean;
}

export interface SommelierResponse {
  reply: string;
  citedProductIds: string[];
}

export interface RagAiGatewayPort {
  readonly embeddingModel: string;
  readonly embeddingDimensions: number;

  generateEmbeddings(text: string, taskType: EmbeddingTaskType): Promise<number[]>;
  decomposeQuery(userQuery: string): Promise<QueryDecomposition>;
  generateSommelierResponse(prompt: {
    systemInstruction: string;
    userQuery: string;
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    ragContext: string;
  }): Promise<SommelierResponse>;
}
