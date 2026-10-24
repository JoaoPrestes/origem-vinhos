import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  RagLexicalIndexPort,
  LexicalChunkItem,
  LexicalQueryResult,
} from '../ports/rag-lexical-index.port';

const PT_STOPWORDS = new Set([
  'de', 'do', 'da', 'em', 'para', 'com', 'um', 'uma', 'os', 'as',
  'que', 'e', 'o', 'a', 'no', 'na', 'dos', 'das', 'por', 'se',
  'mais', 'como', 'mas', 'ao', 'aos', 'seu', 'sua', 'ou'
]);

export class BunSqliteFtsAdapter implements RagLexicalIndexPort {
  private db: Database;

  constructor(dbPath: string = './data/rag_lexical.db') {
    if (dbPath !== ':memory:') {
      const dir = dirname(dbPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);
    this.configurePragmas();
    this.initTables();
  }

  private configurePragmas(): void {
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
      this.db.exec('PRAGMA busy_timeout = 5000;');
    } catch {
      // Modos ignorados silenciosamente para bancos :memory:
    }
  }

  private initTables(): void {
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS catalog_chunks_fts USING fts5(
        chunk_id UNINDEXED,
        product_id UNINDEXED,
        chunk_type UNINDEXED,
        version UNINDEXED,
        content,
        tokenize = 'unicode61 remove_diacritics 2'
      );

      CREATE TABLE IF NOT EXISTS indexed_versions (
        product_id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async upsertChunks(productId: string, version: number, chunks: LexicalChunkItem[]): Promise<void> {
    const tx = this.db.transaction(() => {
      // Remove chunks anteriores do produto
      this.db.run(`DELETE FROM catalog_chunks_fts WHERE product_id = ?`, [productId]);

      // Insere os chunks ativos
      const insertChunk = this.db.prepare(`
        INSERT INTO catalog_chunks_fts (chunk_id, product_id, chunk_type, version, content)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const chunk of chunks) {
        insertChunk.run(chunk.id, productId, chunk.type, version, chunk.content);
      }

      // Atualiza controle de versão
      this.db.run(
        `INSERT OR REPLACE INTO indexed_versions (product_id, version, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [productId, version]
      );
    });

    tx();
  }

  async deleteProductChunks(productId: string): Promise<void> {
    const tx = this.db.transaction(() => {
      this.db.run(`DELETE FROM catalog_chunks_fts WHERE product_id = ?`, [productId]);
      this.db.run(`DELETE FROM indexed_versions WHERE product_id = ?`, [productId]);
    });

    tx();
  }

  async deleteByProductId(productId: string): Promise<void> {
    return this.deleteProductChunks(productId);
  }

  async query(searchQuery: string, limit: number = 8): Promise<LexicalQueryResult[]> {
    const sanitizedMatchQuery = this.buildMatchQuery(searchQuery);
    if (!sanitizedMatchQuery) {
      return [];
    }

    try {
      const stmt = this.db.query(`
        SELECT 
          chunk_id AS chunkId,
          product_id AS productId,
          chunk_type AS chunkType,
          version,
          bm25(catalog_chunks_fts, 2.0, 1.0) AS score
        FROM catalog_chunks_fts
        WHERE catalog_chunks_fts MATCH ?
        ORDER BY score ASC
        LIMIT ?
      `);

      const rows = stmt.all(sanitizedMatchQuery, limit) as LexicalQueryResult[];
      return rows.map((r) => ({
        ...r,
        version: Number(r.version),
        score: Number(r.score),
      }));
    } catch {
      // Se houver erro de sintaxe na query FTS, retorna vazio para fallback seguro
      return [];
    }
  }

  async getVersion(productId: string): Promise<number | null> {
    const row = this.db.query(`SELECT version FROM indexed_versions WHERE product_id = ?`).get(productId) as {
      version: number;
    } | null;

    return row ? Number(row.version) : null;
  }

  async getAllVersions(): Promise<Array<{ productId: string; version: number }>> {
    const rows = this.db.query(`SELECT product_id AS productId, version FROM indexed_versions`).all() as Array<{
      productId: string;
      version: number;
    }>;

    return rows.map((r) => ({ productId: r.productId, version: Number(r.version) }));
  }

  async rebuildInPlace(): Promise<void> {
    try {
      this.db.exec(`
        DROP TABLE IF EXISTS catalog_chunks_fts;
        DROP TABLE IF EXISTS indexed_versions;
      `);
      try {
        this.db.exec(`PRAGMA wal_checkpoint(TRUNCATE);`);
      } catch {
        // WAL truncate checkpoint
      }
      this.initTables();
    } catch (err) {
      console.error('Falha na reconstrução in-place do SQLite FTS5:', err);
      throw err;
    }
  }

  close(): void {
    this.db.close();
  }

  private buildMatchQuery(rawQuery: string): string | null {
    if (!rawQuery || rawQuery.trim().length === 0) return null;

    // Remove caracteres especiais que quebram a sintaxe do FTS5
    const cleanQuery = rawQuery.replace(/[^\p{L}\p{N}\s]/gu, ' ');

    const words = cleanQuery
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0 && !PT_STOPWORDS.has(w));

    if (words.length === 0) {
      return null;
    }

    // Aplica prefixo '*' para palavras com 4 ou mais caracteres para contemplar flexões PT-BR
    const tokens = words.map((w) => (w.length >= 4 ? `${w}*` : w));

    return tokens.join(' AND ');
  }
}
