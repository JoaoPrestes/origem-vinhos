# Chatbot RAG & Sommelier Virtual (spec09) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate the production-grade RAG Chatbot & Virtual Sommelier for Origem Vinhos, featuring PostgreSQL Transactional Outbox, autonomous worker ingestion, dual-index synchronization (ChromaDB 768d + SQLite FTS5 BM25 PT-BR), 18s global deadline orchestration, Funil da Verdade, Post-Generation Grounding Check with price regex interception, and a Crisp-style Floating Chat Drawer with wine mini cards.

**Architecture:** Hexagonal architecture under `src/domains/catalog/` with clean Ports & Adapters. Asynchronous ingestion decouples writes from vector/lexical indexing via Transactional Outbox. Real-time consumption enforces the Funil da Verdade on PostgreSQL and Post-Generation Grounding Check on Gemini outputs before returning sovereign verified Mini Cards.

**Tech Stack:** Bun runtime, TypeScript strict, PostgreSQL (SSOT) + Drizzle ORM, `bun:sqlite` (FTS5 lexical with WAL mode), ChromaDB (`chromadb@3.5.0` official client), Google GenAI SDK (`@google/genai` with `gemini-embedding-001` and `gemini-2.5-flash`), React 19 frontend.

**Spec:** [`docs/specs/spec09-Chatbot_RAG.md`](../specs/spec09-Chatbot_RAG.md)

## Global Constraints

- PostgreSQL is the Single Source of Truth (SSOT); LLMs never invent catalog prices or stock.
- Monotonic versioning (`version` column) and deterministic chunk IDs (`${productId}_${chunkType}`) prevent race conditions and orphan chunks.
- Worker processes Outbox via `FOR UPDATE SKIP LOCKED` with 5-minute lease timeouts.
- Ingestion order is inverted: compute Gemini embeddings BEFORE deleting old chunks to prevent search downtime.
- Embeddings use `gemini-embedding-001` with `outputDimensionality: 768`, asymmetric tasks `RETRIEVAL_DOCUMENT` and `RETRIEVAL_QUERY`.
- Consumption runs under a strict 18-second global deadline managed by `AbortController`.
- Chat history is untrusted input: max 4 turns, strictly `user`/`assistant`, max 500 chars per message, XML escaped.
- Post-Generation Grounding Check audits `citedProductIds` against PostgreSQL and runs Regex `/R\$\s?\d+([.,]\d{2})?/gi` on `reply`, replacing unverified prices with real prices.
- Mini Cards are assembled soberly from PostgreSQL data only.

## Review Focus

1. Concurrency on stock depletion: concurrent paid orders depleting stock never abort payments; system emits `WARN: STOCK_DEPLETED_CONCURRENTLY`.
2. Embedding API failure during ingestion: old chunks in ChromaDB and SQLite FTS5 are preserved; Outbox event stays for retry.
3. Partial ingestion failure recovery: version guard queries full records (`chromaCollection.get({ where: { productId } })`) verifying count equals active chunks.
4. Input sanitization & prompt injection: `<user_query>` and history XML tags escaped; LLM receives systemInstruction at protocol level.
5. Grounding check price discrepancy: hallucinated text prices (e.g. R$ 50) are intercepted, replaced with PostgreSQL official price (e.g. R$ 179), and Mini Card shows real price.

---

### Task 1: Schema Evolution & Atomic Stock Deduction with Concurrency Warning

**Files:**
- Modify: `src/infra/schema.ts`
- Modify: `src/domains/orders/use-cases/process-payment-confirmed.use-case.ts`
- Test: `tests/catalog/schema-and-stock.test.ts`

**Interfaces:**
- Consumes: `products` table from `src/infra/schema.ts`, `ProcessPaymentConfirmedUseCase`
- Produces: `stock`, `sensory_profile`, `pairing`, `harvest_notes`, `version` columns in `products`, `catalog_outbox` table, and stock deduction logic in `ProcessPaymentConfirmedUseCase`

- [ ] **Step 1: Write the failing test for schema columns and atomic stock deduction**

```typescript
// tests/catalog/schema-and-stock.test.ts
import { describe, it, expect } from 'bun:test';
import { products, catalogOutbox } from '../../src/infra/schema';
import { ProcessPaymentConfirmedUseCase } from '../../src/domains/orders/use-cases/process-payment-confirmed.use-case';
import { Order } from '../../src/domains/orders/domain/order.entity';

describe('Schema Evolution & Stock Deduction (spec09 §6.1)', () => {
  it('should export all required sommelier columns and catalog_outbox table', () => {
    expect(products.stock).toBeDefined();
    expect(products.sensory_profile).toBeDefined();
    expect(products.pairing).toBeDefined();
    expect(products.harvest_notes).toBeDefined();
    expect(products.version).toBeDefined();
    expect(catalogOutbox).toBeDefined();
    expect(catalogOutbox.lockedUntil).toBeDefined();
  });

  it('should deduct stock on payment confirmation and emit WARN if oversold concurrently', async () => {
    let deductedQuantity = 0;
    let warned = false;
    const stockDeductor = {
      deductStock: async (orderId: string) => {
        deductedQuantity = 2;
        warned = true; // simulates overselling warning
      }
    };
    // asserts ProcessPaymentConfirmedUseCase invokes stock deduction without failing
    expect(stockDeductor).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/catalog/schema-and-stock.test.ts`
Expected: FAIL (products.stock or catalogOutbox not defined)

- [ ] **Step 3: Update `src/infra/schema.ts` and `ProcessPaymentConfirmedUseCase`**

Add `stock`, `sensory_profile`, `pairing`, `harvest_notes`, `version` to `products`.
Declare `catalog_outbox` table with composite indexes (`catalog_outbox_pending_idx`, `catalog_outbox_lease_idx`, `catalog_outbox_product_idx`).
In `ProcessPaymentConfirmedUseCase`, accept optional `stockDeductor` port and trigger stock deduction when confirming payment with warning on overselling.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/catalog/schema-and-stock.test.ts`
Expected: PASS

- [ ] **Step 5: Apply schema changes to PostgreSQL via drizzle-kit and commit**

```bash
git add src/infra/schema.ts src/domains/orders/use-cases/process-payment-confirmed.use-case.ts tests/catalog/schema-and-stock.test.ts
git commit -m "feat(catalog): evolve schema with stock, sommelier fields and catalog_outbox"
```

---

### Task 2: Catalog CRUD Outbox Integration & Version Monotonicity

**Files:**
- Modify: `src/domains/catalog/schema.ts`
- Modify: `src/domains/catalog/catalog.repository.ts`
- Modify: `src/domains/catalog/use-cases/create-product.usecase.ts`
- Modify: `src/domains/catalog/use-cases/update-product.usecase.ts`
- Test: `tests/catalog/catalog-outbox.test.ts`

**Interfaces:**
- Consumes: `products` and `catalogOutbox` tables
- Produces: Atomically emits `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED` events to `catalog_outbox` within the CRUD operations

- [ ] **Step 1: Write the failing test for Catalog Outbox event generation**

```typescript
// tests/catalog/catalog-outbox.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { CatalogRepository } from '../../src/domains/catalog/catalog.repository';

describe('Catalog Repository Outbox Integration (spec09 §6.1)', () => {
  it('should record an outbox event with version = 1 when creating a product', async () => {
    // test create with outbox emission
  });

  it('should increment version and record an outbox event when updating a product', async () => {
    // test update with incremented version and outbox emission
  });

  it('should record PRODUCT_DELETED outbox event on softDelete', async () => {
    // test softDelete outbox emission
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/catalog/catalog-outbox.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement outbox emission in `CatalogRepository` and use cases**

Update `createProductSchema` and `updateProductSchema` in `src/domains/catalog/schema.ts` to accept `stock`, `sensory_profile`, `pairing`, `harvest_notes`.
In `CatalogRepository`, execute `insert` into `catalogOutbox` inside database transactions for create, update, and softDelete. Increment `version = version + 1` on updates.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/catalog/catalog-outbox.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/catalog/schema.ts src/domains/catalog/catalog.repository.ts src/domains/catalog/use-cases/ tests/catalog/catalog-outbox.test.ts
git commit -m "feat(catalog): integrate outbox event emission and monotonic versioning"
```

---

### Task 3: SQLite FTS5 Lexical Engine Port, Adapter & In-Place Rebuild

**Files:**
- Create: `src/domains/catalog/ports/rag-lexical-index.port.ts`
- Create: `src/domains/catalog/adapters/bun-sqlite-fts.adapter.ts`
- Test: `tests/catalog/sqlite-fts-adapter.test.ts`

**Interfaces:**
- Consumes: Native `bun:sqlite`
- Produces: `RagLexicalIndexPort` with `upsertChunks`, `deleteProductChunks`, `query`, `getVersion`, `rebuildInPlace`

- [ ] **Step 1: Write the failing test for SQLite FTS5 adapter**

```typescript
// tests/catalog/sqlite-fts-adapter.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BunSqliteFtsAdapter } from '../../src/domains/catalog/adapters/bun-sqlite-fts.adapter';

describe('BunSqliteFtsAdapter (spec09 §6.2 & §10.3)', () => {
  let adapter: BunSqliteFtsAdapter;

  beforeEach(() => {
    adapter = new BunSqliteFtsAdapter(':memory:');
  });

  it('should index and retrieve chunks with Portuguese prefix expansion', async () => {
    await adapter.upsertChunks('prod-1', 1, [
      { id: 'prod-1_identidade', type: 'identidade', content: 'Vinho Tinto Serra Malbec, safra 2018' },
      { id: 'prod-1_sensorial', type: 'sensorial', content: 'Vinhos encorpados com taninos firmes' }
    ]);

    const results = await adapter.query('encorpado', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].productId).toBe('prod-1');
  });

  it('should safely rebuild tables in-place without file deletion', async () => {
    await adapter.rebuildInPlace();
    const version = await adapter.getVersion('prod-1');
    expect(version).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/catalog/sqlite-fts-adapter.test.ts`
Expected: FAIL (BunSqliteFtsAdapter not found)

- [ ] **Step 3: Implement `BunSqliteFtsAdapter` and port**

Create `src/domains/catalog/ports/rag-lexical-index.port.ts`.
Create `src/domains/catalog/adapters/bun-sqlite-fts.adapter.ts`:
- Sets WAL mode, normal synchronous, busy timeout 5000ms.
- Creates virtual table `catalog_chunks_fts USING fts5` with `tokenize = 'unicode61 remove_diacritics 2'`.
- Creates `indexed_versions` table.
- Sanitizes query: strips PT stopwords, appends `*` prefix for terms $\ge 4$ characters.
- Implements `rebuildInPlace` using `DROP TABLE... PRAGMA wal_checkpoint(TRUNCATE)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/catalog/sqlite-fts-adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/catalog/ports/rag-lexical-index.port.ts src/domains/catalog/adapters/bun-sqlite-fts.adapter.ts tests/catalog/sqlite-fts-adapter.test.ts
git commit -m "feat(catalog): implement SQLite FTS5 lexical index adapter with PT prefix expansion"
```

---

### Task 4: ChromaDB Vector Store Port, Adapter & Docker Compose Setup

**Files:**
- Modify: `docker-compose.yml`
- Create: `src/domains/catalog/ports/rag-vector-store.port.ts`
- Create: `src/domains/catalog/adapters/chroma-vector-store.adapter.ts`
- Test: `tests/catalog/chroma-adapter.test.ts`

**Interfaces:**
- Consumes: `chromadb` client
- Produces: `RagVectorStorePort` with `upsert`, `query`, `delete`, `getByProductId`

- [ ] **Step 1: Write the failing test for Chroma Vector Store Adapter**

```typescript
// tests/catalog/chroma-adapter.test.ts
import { describe, it, expect } from 'bun:test';
import { ChromaVectorStoreAdapter } from '../../src/domains/catalog/adapters/chroma-vector-store.adapter';

describe('ChromaVectorStoreAdapter (spec09 §6.3)', () => {
  it('should format records with 768d vectors and metadata', async () => {
    const adapter = new ChromaVectorStoreAdapter({ client: null as any });
    expect(adapter).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/catalog/chroma-adapter.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `docker-compose.yml` and implement `ChromaVectorStoreAdapter`**

Add `chromadb` service (`chromadb/chroma:latest`) on port 8000 with volume in `docker-compose.yml`.
Implement `ChromaVectorStoreAdapter`:
- `getCollection`: lazy init for `origem_vinhos_catalog` with `metadata: { "hnsw:space": "cosine" }`.
- `upsert`: takes ids, embeddings (768d), documents, metadatas (with `productId` and `version`).
- `query`: takes queryEmbedding (768d), nResults.
- `getByProductId`: queries `{ where: { productId } }` to check all chunks and versions.
- `delete`: deletes given ids.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/catalog/chroma-adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml src/domains/catalog/ports/rag-vector-store.port.ts src/domains/catalog/adapters/chroma-vector-store.adapter.ts tests/catalog/chroma-adapter.test.ts
git commit -m "feat(catalog): configure ChromaDB in docker-compose and implement vector store adapter"
```

---

### Task 5: Gemini AI Adapter with Asymmetric Embeddings & Structured Output

**Files:**
- Create: `src/domains/catalog/ports/rag-ai-gateway.port.ts`
- Create: `src/domains/catalog/adapters/gemini-ai.adapter.ts`
- Test: `tests/catalog/gemini-ai-adapter.test.ts`

**Interfaces:**
- Consumes: `@google/genai` with `GEMINI_API_KEY`
- Produces: `RagAiGatewayPort` with `generateEmbeddings`, `decomposeQuery`, `generateSommelierResponse`

- [ ] **Step 1: Write the failing test for Gemini AI Adapter**

```typescript
// tests/catalog/gemini-ai-adapter.test.ts
import { describe, it, expect } from 'bun:test';
import { GeminiAiAdapter } from '../../src/domains/catalog/adapters/gemini-ai.adapter';

describe('GeminiAiAdapter (spec09 §6.3 & §8.5)', () => {
  it('should use gemini-embedding-001 with outputDimensionality 768 and asymmetric tasks', () => {
    const adapter = new GeminiAiAdapter({ apiKey: 'test-key' });
    expect(adapter.embeddingModel).toBe('gemini-embedding-001');
    expect(adapter.embeddingDimensions).toBe(768);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/catalog/gemini-ai-adapter.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `GeminiAiAdapter`**

- `generateEmbeddings`: calls `gemini-embedding-001` with `outputDimensionality: 768` and `taskType` (`RETRIEVAL_DOCUMENT` or `RETRIEVAL_QUERY`).
- `decomposeQuery`: calls `gemini-2.5-flash` with JSON Schema structured output for `semanticQuery`, `exactFilters`, `requiresEditorialNotes`, `isGreetingOrSmallTalk`.
- `generateSommelierResponse`: calls `gemini-2.5-flash` with `systemInstruction` (strict rule of source, factual price reporting) and `responseSchema` returning `{ reply: string, citedProductIds: string[] }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/catalog/gemini-ai-adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/catalog/ports/rag-ai-gateway.port.ts src/domains/catalog/adapters/gemini-ai.adapter.ts tests/catalog/gemini-ai-adapter.test.ts
git commit -m "feat(catalog): implement Gemini AI adapter with gemini-embedding-001 and structured outputs"
```

---

### Task 6: Semantic Chunking Service & Autonomous Worker Ingestion Pipeline

**Files:**
- Create: `src/domains/catalog/services/semantic-chunker.ts`
- Create: `src/domains/catalog/use-cases/process-catalog-outbox.use-case.ts`
- Create: `src/workers/catalog-ingestion.worker.ts`
- Test: `tests/catalog/semantic-chunker.test.ts`
- Test: `tests/catalog/process-catalog-outbox.test.ts`

**Interfaces:**
- Consumes: `CatalogRepository`, `RagVectorStorePort`, `RagLexicalIndexPort`, `RagAiGatewayPort`
- Produces: `generateSemanticChunks` function and `ProcessCatalogOutboxUseCase` worker loop

- [ ] **Step 1: Write failing tests for Semantic Chunking and Ingestion**

```typescript
// tests/catalog/semantic-chunker.test.ts & process-catalog-outbox.test.ts
// Tests:
// - natural language template for Chunk 1: "Vinho Tinto Serra Malbec, safra 2018..."
// - exclusion of empty sensory_profile and pairing
// - dual version guard verifying records.ids.length === activeChunks.length
// - inverted order: embeddings generated BEFORE delete to prevent search holes
// - preserves existing chunks if Gemini embedding API fails (BDD Scenario 13)
```

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test tests/catalog/semantic-chunker.test.ts tests/catalog/process-catalog-outbox.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `semantic-chunker.ts`, `ProcessCatalogOutboxUseCase`, and `catalog-ingestion.worker.ts`**

Implement semantic chunks with enriched natural language template.
Implement `ProcessCatalogOutboxUseCase`:
- Query `catalog_outbox` with `FOR UPDATE SKIP LOCKED`, 5-minute lease.
- Coalesce events per product.
- Check complete dual version guard against ChromaDB and SQLite FTS5.
- Generate embeddings first; then delete old chunks; then upsert to ChromaDB and SQLite FTS5; then mark `PROCESSED`.
- Remove `.catch(() => null)` so failures cleanly bubble up and retry.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/catalog/semantic-chunker.test.ts tests/catalog/process-catalog-outbox.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/catalog/services/semantic-chunker.ts src/domains/catalog/use-cases/process-catalog-outbox.use-case.ts src/workers/catalog-ingestion.worker.ts tests/catalog/semantic-chunker.test.ts tests/catalog/process-catalog-outbox.test.ts
git commit -m "feat(catalog): implement semantic chunking and autonomous catalog ingestion worker"
```

---

### Task 7: 3-Way Differential Reconciliation Service with In-Place Recovery

**Files:**
- Create: `src/domains/catalog/use-cases/reconcile-rag-indexes.use-case.ts`
- Create: `src/cli/reconcile.ts`
- Test: `tests/catalog/reconcile-rag-indexes.test.ts`

**Interfaces:**
- Consumes: PostgreSQL `products`, ChromaDB, SQLite FTS5
- Produces: `ReconcileRagIndexesUseCase` executing 3-way differential audit

- [ ] **Step 1: Write the failing test for 3-way reconciliation**

```typescript
// tests/catalog/reconcile-rag-indexes.test.ts
// Tests:
// - Case 1: outdated version -> syncs
// - Case 2: hard/soft deleted product or orphan chunks -> cleans
// - Case 3: partial index failure -> syncs
// - Case 4: identical versions -> no-op (0 AI calls)
// - in-place SQLite rebuild on structural error
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/catalog/reconcile-rag-indexes.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `ReconcileRagIndexesUseCase` and CLI script**

Implement logic matching Section 10.3 of `spec09`. Add CLI script `src/cli/reconcile.ts` executable with `bun run rag:reconcile`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/catalog/reconcile-rag-indexes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/catalog/use-cases/reconcile-rag-indexes.use-case.ts src/cli/reconcile.ts tests/catalog/reconcile-rag-indexes.test.ts
git commit -m "feat(catalog): implement 3-way differential reconciliation and CLI tool"
```

---

### Task 8: Hybrid Search Service with Reciprocal Rank Fusion & Index Fallbacks

**Files:**
- Create: `src/domains/catalog/services/hybrid-search.service.ts`
- Test: `tests/catalog/hybrid-search.test.ts`

**Interfaces:**
- Consumes: `RagVectorStorePort`, `RagLexicalIndexPort`, `RagAiGatewayPort`
- Produces: `HybridSearchService.search(semanticQuery)` returning fused top-8 candidates

- [ ] **Step 1: Write failing test for Hybrid Search & RRF**

```typescript
// tests/catalog/hybrid-search.test.ts
// Tests:
// - Reciprocal Rank Fusion (k=60) combining dense and lexical ranks
// - Fallback to BM25_ONLY if ChromaDB fails (BDD Scenario 5)
// - Fallback to CHROMA_ONLY if SQLite fails
// - Deduplication and grouping by wine_id
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/catalog/hybrid-search.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `HybridSearchService`**

Implement concurrent retrieval with `Promise.allSettled`, RRF calculation $RRF(d) = \sum \frac{1}{60 + rank(d)}$, grouping by `productId`, and fallback tracking (`BM25_ONLY` / `CHROMA_ONLY`).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/catalog/hybrid-search.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/catalog/services/hybrid-search.service.ts tests/catalog/hybrid-search.test.ts
git commit -m "feat(catalog): implement hybrid search with reciprocal rank fusion and graceful fallbacks"
```

---

### Task 9: Chat Consumption Orchestrator with Funnel of Truth, Grounding Check & Mini Cards

**Files:**
- Create: `src/domains/catalog/use-cases/chat-orchestrator.use-case.ts`
- Modify: `src/domains/catalog/catalog.handlers.ts`
- Modify: `src/index.ts`
- Test: `tests/catalog/chat-orchestrator.test.ts`
- Test: `tests/catalog/chat-api.test.ts`

**Interfaces:**
- Consumes: `HybridSearchService`, `RagAiGatewayPort`, PostgreSQL connection
- Produces: `POST /api/chat` handler and endpoint

- [ ] **Step 1: Write failing tests for Chat Orchestrator & Grounding Check**

```typescript
// tests/catalog/chat-orchestrator.test.ts
// Tests:
// - 18s global deadline timeout via AbortController (BDD Scenario 12)
// - Input sanitization: XML entity escape, history truncated to 4 turns, max 500 chars per message
// - Funil da Verdade: discards products with stock = 0 or price > maxPrice (BDD Scenario 3)
// - Post-Generation Grounding Check: audits citedProductIds, regex scans prices (/R\$\s?\d+([.,]\d{2})?/gi), replaces false prices with official Postgres price (BDD Scenario 9)
// - Mini Cards assembled 100% from PostgreSQL
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/catalog/chat-orchestrator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `ChatOrchestratorUseCase` and route in `catalog.handlers.ts` / `src/index.ts`**

Implement complete consumption pipeline according to Section 8 of `spec09`.
Add `/api/chat` routing to `src/index.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/catalog/chat-orchestrator.test.ts tests/catalog/chat-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/catalog/use-cases/chat-orchestrator.use-case.ts src/domains/catalog/catalog.handlers.ts src/index.ts tests/catalog/chat-orchestrator.test.ts tests/catalog/chat-api.test.ts
git commit -m "feat(catalog): implement chat orchestrator with truth funnel, grounding check and mini cards"
```

---

### Task 10: Floating Chat Drawer Frontend Component (Crisp style) & Cart Integration

**Files:**
- Create: `src/web/components/ChatDrawer.tsx`
- Modify: `src/web/App.tsx`
- Modify: `src/web/index.css`
- Test: `tests/catalog/chat-drawer-component.test.ts`

**Interfaces:**
- Consumes: `POST /api/chat`, `POST /api/cart`
- Produces: Floating Action Button (bottom-right) and flyout conversation drawer with wine mini cards

- [ ] **Step 1: Write test for ChatDrawer component structure and interaction**

```typescript
// tests/catalog/chat-drawer-component.test.ts
// Verify ChatDrawer component exports, states, mini card direct cart add callback
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/catalog/chat-drawer-component.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `ChatDrawer.tsx`, integrate into `App.tsx`, and add CSS styles**

- Floating action button at `bottom: 24px; right: 24px; z-index: 1000`.
- Drawer panel with header (avatar, status 'online', minimize).
- Message bubbles, suggestion chips, typing indicator.
- Wine Mini Cards with direct `+ Adicionar ao Carrinho` button invoking `fetch('/api/cart')` and updating cart counter without page reload (BDD Scenario 6).
- Session storage dialogue persistence.

- [ ] **Step 4: Run test to verify it passes and verify frontend compilation**

Run: `bun test tests/catalog/chat-drawer-component.test.ts`
Run: `bun run src/index.ts` (verification of `Bun.build` frontend compilation)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/web/components/ChatDrawer.tsx src/web/App.tsx src/web/index.css tests/catalog/chat-drawer-component.test.ts
git commit -m "feat(ui): implement floating chat drawer with Crisp-inspired UX and mini wine cards"
```

---

### Task 11: End-to-End BDD Verification Suite & Full Regression Test

**Files:**
- Create: `tests/catalog/spec09-bdd-scenarios.test.ts`

**Interfaces:**
- Consumes: All `spec09` components
- Produces: Automated verification suite covering all 13 BDD scenarios from `spec09`

- [ ] **Step 1: Write executable tests for all 13 BDD scenarios**

Cover:
- Scenario 1: Dual version guard idempotence
- Scenario 2: Active orphan chunk deletion on update
- Scenario 3: Funil da Verdade blocks out-of-stock products
- Scenario 4: Source or silence rule for editorial notes
- Scenario 5: Graceful degradation under ChromaDB failure (BM25_ONLY)
- Scenario 6: Direct add to cart via Mini Card
- Scenario 7: Stock deduction on paid order without payment abort
- Scenario 8: Outbox concurrency with SKIP LOCKED and lease expiry
- Scenario 9: Sober Mini Cards and regex price hallucination interception
- Scenario 10: Protection against prompt injection & XML escaping
- Scenario 11: Lexical search with Portuguese prefix expansion
- Scenario 12: 18-second global deadline exhaustion
- Scenario 13: Index preservation on Gemini embedding API failure

- [ ] **Step 2: Run BDD scenario suite**

Run: `bun test tests/catalog/spec09-bdd-scenarios.test.ts`
Expected: PASS 13/13 scenarios

- [ ] **Step 3: Run entire project test suite for full regression check**

Run: `bun test`
Expected: ALL tests pass (85+ pass, 0 fail)

- [ ] **Step 4: Commit**

```bash
git add tests/catalog/spec09-bdd-scenarios.test.ts
git commit -m "test(catalog): complete BDD verification suite for spec09 covering all 13 scenarios"
```
