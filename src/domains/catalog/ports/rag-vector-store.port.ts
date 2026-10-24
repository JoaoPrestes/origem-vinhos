export interface VectorChunkMetadata {
  productId: string;
  productName?: string;
  harvest?: number;
  wineType?: string;
  grape?: string;
  chunkType: string;
  version: number;
  updatedAt?: string;
  [key: string]: any;
}

export interface VectorChunkItem {
  id: string;
  embedding: number[];
  document: string;
  metadata: VectorChunkMetadata;
}

export interface VectorQueryResult {
  id: string;
  productId: string;
  chunkType: string;
  distance: number;
  document: string;
  metadata: VectorChunkMetadata;
}

export interface RagVectorStorePort {
  upsert(chunks: VectorChunkItem[]): Promise<void>;
  query(queryEmbedding: number[], nResults?: number): Promise<VectorQueryResult[]>;
  delete(ids: string[]): Promise<void>;
  deleteByProductId(productId: string): Promise<void>;
  getByProductId(productId: string): Promise<{
    ids: string[];
    metadatas: VectorChunkMetadata[];
    documents: string[];
  }>;
  getAllRecords(): Promise<{
    ids: string[];
    metadatas: VectorChunkMetadata[];
  }>;
}
