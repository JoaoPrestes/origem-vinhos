# Admin Stock Management and Catalog RAG Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable stock management in the Admin CRUD modal, ensure the Catalog Ingestion Worker automatically synchronizes catalog events to SQLite FTS and ChromaDB, and reconcile outbox records so newly added wines (like Château Les Compères Sauternes) are indexed and recommended by the Sommelier RAG chatbot.

**Architecture:** Frontend React updates `Product` interface and the "Novo Vinho / Editar Vinho" modal with an `Estoque (Unidades)` numeric input. The payload is sent to `POST /api/catalog` or `PUT /api/catalog/:id` which already supports stock in `schema.ts` and `catalog.repository.ts`. `src/index.ts` is configured to launch `startCatalogIngestionWorker` automatically outside of unit tests, continuously polling `catalog_outbox` and synchronizing chunks with SQLite FTS and ChromaDB. Sauternes' stock is updated to positive stock (`10`), and outbox events are drained and verified.

**Tech Stack:** React 19, TypeScript, Bun, PostgreSQL (Drizzle ORM), SQLite FTS5, ChromaDB, Gemini/OpenRouter AI.

**Spec:** `docs/specs/spec09-Chatbot_RAG.md` (§8.4 Truth Funnel: `WHERE stock > 0`)

## Global Constraints
- Stock must be a non-negative integer (`min: 0, integer`).
- Truth Funnel strictly requires `stock > 0` for commercial availability in Sommelier recommendations.
- All existing 133 tests must continue to pass without regression.
- Ingestion worker must not run as an unstopped infinite loop during `NODE_ENV === 'test'` unit tests.

## Review Focus
1. Creating a wine without specifying stock defaults to a valid non-negative integer (e.g. 10 or 0).
2. Editing an existing wine preserves its current stock value instead of resetting it.
3. Negative or decimal stock values are rejected with a clear user validation error.
4. Server startup in `src/index.ts` gracefully starts the worker without blocking HTTP requests.
5. Outbox synchronization handles existing pending records without duplicate primary key collisions.

---

### Task 1: Admin CRUD Stock Management in Frontend

**Files:**
- Modify: `src/web/components/WineCard.tsx:6-17, 150-156`
- Modify: `src/web/pages/Catalog.tsx:90-140, 320-350`
- Test: Frontend build check (`bun run build` / `bun build ./src/web/index.tsx`)

**Interfaces:**
- Consumes: `POST /api/catalog` and `PUT /api/catalog/:id` body schema with `{ stock: number }`.
- Produces: `Product.stock?: number` in `WineCard.tsx`, input UI in `Catalog.tsx`.

- [ ] **Step 1: Update Product interface in `src/web/components/WineCard.tsx`**
Add `stock?: number;` to `export interface Product`.
In the card footer, if `isAdmin` is true and `product.stock !== undefined`, display stock quantity.

- [ ] **Step 2: Add formStock state and handlers in `src/web/pages/Catalog.tsx`**
Add `const [formStock, setFormStock] = useState('10');`.
In `openCreateModal`: `setFormStock('10');`.
In `openEditModal`: `setFormStock(p.stock !== undefined ? p.stock.toString() : '0');`.
In `handleSaveProduct`:
```typescript
const stockNum = parseInt(formStock, 10);
if (isNaN(stockNum) || stockNum < 0) {
  setFormError('O estoque deve ser um número inteiro igual ou maior que zero.');
  setFormLoading(false);
  return;
}
```
Add `stock: stockNum` to the payload.

- [ ] **Step 3: Add Estoque input in Admin Modal JSX (`src/web/pages/Catalog.tsx`)**
Place `Estoque (Unidades)` input next to `Preço (R$)` in a 2-column `form-row`:
```tsx
<div className="form-row">
  <Input
    label="Preço (R$)"
    type="number"
    step="0.01"
    min="0"
    value={formPrice}
    onChange={e => setFormPrice(e.target.value)}
    required
  />
  <Input
    label="Estoque (Unidades)"
    type="number"
    step="1"
    min="0"
    value={formStock}
    onChange={e => setFormStock(e.target.value)}
    required
  />
</div>
```
And keep `Tipo de Vinho` in its own full-width `form-group`.

- [ ] **Step 4: Verify Frontend Build**
Run: `bun build ./src/web/index.tsx --outdir ./dist`
Expected: Success with 0 errors.

- [ ] **Step 5: Commit**
```bash
git add src/web/components/WineCard.tsx src/web/pages/Catalog.tsx dist/index.js
git commit -m "feat(catalog): add stock management to admin product CRUD modal"
```

---

### Task 2: Background Ingestion Worker Auto-Start in Server

**Files:**
- Modify: `src/index.ts:1-25, 220-225`
- Test: `tests/catalog/worker-autostart.test.ts`

**Interfaces:**
- Consumes: `startCatalogIngestionWorker` from `src/workers/catalog-ingestion.worker.ts`.
- Produces: Continuous polling of `catalog_outbox` in dev/production mode.

- [ ] **Step 1: Write unit test for worker conditional start**
Create `tests/catalog/worker-autostart.test.ts` verifying that `startCatalogIngestionWorker` can be instantiated and stopped cleanly.

- [ ] **Step 2: Run test to verify it passes**
Run: `bun test tests/catalog/worker-autostart.test.ts`
Expected: PASS

- [ ] **Step 3: Modify `src/index.ts` to start worker when not in test**
Import `startCatalogIngestionWorker` in `src/index.ts`.
Add conditional startup:
```typescript
if (process.env.NODE_ENV !== 'test') {
  startCatalogIngestionWorker().catch((err) => {
    console.error('[Worker] Falha ao iniciar worker de ingestão do catálogo:', err);
  });
}
```

- [ ] **Step 4: Verify full test suite passes**
Run: `bun test`
Expected: All tests pass.

- [ ] **Step 5: Commit**
```bash
git add src/index.ts tests/catalog/worker-autostart.test.ts
git commit -m "feat(worker): auto-start catalog ingestion worker with server in dev/prod"
```

---

### Task 3: Sauternes Stock Reconciliation & Outbox Ingestion

**Files:**
- Execute: Database update for Sauternes (`stock = 10`)
- Execute: Outbox processor batch execution (`ProcessCatalogOutboxUseCase.executeBatch`)
- Verify: SQLite FTS table and ChromaDB collection

**Interfaces:**
- Consumes: PostgreSQL `products` and `catalog_outbox`.
- Produces: Synchronized FTS and ChromaDB documents with `stock: 10`.

- [ ] **Step 1: Update Sauternes stock in PostgreSQL and create outbox event**
Run script to update `Château Les Compères Sauternes 375ml` to `stock: 10`, increment version, and insert `catalogOutbox` event.

- [ ] **Step 2: Run ingestion batch to process all pending outbox events**
Execute `executeBatch` to process Sauternes and Bellegrave Pomerol pending outbox records.

- [ ] **Step 3: Verify SQLite FTS and ChromaDB contain Sauternes**
Query SQLite FTS and PostgreSQL to ensure Sauternes is present and `status = 'PROCESSED'` in `catalog_outbox`.

- [ ] **Step 4: Commit**
```bash
git commit --allow-empty -m "chore(catalog): reconcile Sauternes stock and sync outbox to search indexes"
```

---

### Task 4: Integration Verification (Sommelier RAG Chatbot)

**Files:**
- Test script: Live chat request to `POST /api/chat` asking about "Les Compères Sauternes".
- Test script: Query "quantos vinhos há no catálogo".

- [ ] **Step 1: Test chat endpoint with Sauternes query**
Send POST `/api/chat` with `{ message: "Vocês têm o vinho Les Compères Sauternes?" }`.
Expected:
- Sommelier finds Sauternes in verified catalog evidence.
- `recommendedProducts` includes `Château Les Compères Sauternes 375ml`.
- Reply contains sommelier description of Sauternes.

- [ ] **Step 2: Test chat endpoint with general catalog query**
Send POST `/api/chat` with `{ message: "Me conte sobre os vinhos de sobremesa que você tem." }`.
Expected:
- Sommelier highlights Tokaji Aszú and/or Sauternes with mini cards.

- [ ] **Step 3: Run complete test suite**
Run: `bun test`
Expected: 133+ tests PASS.

- [ ] **Step 4: Commit and push**
```bash
git push origin main
```
