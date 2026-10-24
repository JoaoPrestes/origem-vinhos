export interface LexicalChunkItem {
  id: string;
  type: string;
  content: string;
}

export interface LexicalQueryResult {
  chunkId: string;
  productId: string;
  chunkType: string;
  version: number;
  score: number;
}

export interface RagLexicalIndexPort {
  upsertChunks(productId: string, version: number, chunks: LexicalChunkItem[]): Promise<void>;
  deleteProductChunks(productId: string): Promise<void>;
  query(searchQuery: string, limit?: number): Promise<LexicalQueryResult[]>;
  getVersion(productId: string): Promise<number | null>;
  getAllVersions(): Promise<Array<{ productId: string; version: number }>>;
  rebuildInPlace(): Promise<void>;
  close(): void;
}
