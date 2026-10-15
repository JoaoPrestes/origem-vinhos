# Plano de Implementação — Pedidos (`spec08`) e Pagamento (`spec07`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o fluxo completo de checkout do Origem Vinhos, transformando o carrinho em um pedido soberano no estado `PENDING_PAYMENT` com snapshot imutável de itens/endereço e liquidando-o de forma atômica e desacoplada via Módulo de Pagamento e Transactional Outbox.

**Architecture:** Arquitetura Hexagonal (Ports & Adapters) em TypeScript estrito sobre Bun e PostgreSQL gerenciado por Drizzle ORM. Pedidos atuam como o agregado imutável de itens e valores soberanos em centavos inteiros; Pagamento orquestra cobranças isoladas (`PaymentAttempt`) e comunica confirmações financeiras de forma assíncrona e confiável via tabela `payment_outbox` consumida pela `order_inbox_events`.

**Tech Stack:** Bun test runner, TypeScript Strict, Drizzle ORM, PostgreSQL, React.

**Spec:**
- [docs/specs/spec08-Pedidos.md](../../specs/spec08-Pedidos.md)
- [docs/specs/spec07-Pagamento.md](../../specs/spec07-Pagamento.md)

## Global Constraints

- Valores monetários estritamente em centavos inteiros (`INTEGER`), proibido o uso de ponto flutuante IEEE 754 para cálculos financeiros.
- Snapshot do endereço de entrega e dos produtos congelado permanentemente nas tabelas do pedido (`orders` e `order_items`).
- Identificação do cliente soberana via sessão JWT autenticada (`user_id`), com bloqueio Anti-IDOR estrito em todas as rotas e repositórios.
- Operações financeiras desacopladas: chamadas HTTP a gateways externos nunca ocorrem dentro de blocos de transação SQL (`BEGIN ... COMMIT`).
- Chaves estrangeiras financeiras protegidas por `ON DELETE RESTRICT`.
- Limpeza seletiva do carrinho baseada nos `cart_item_id` exatos do pedido, preservando novas adições.
- Idempotência de criação por usuário: `PRIMARY KEY (idempotency_key, user_id)` com trava concorrente `PROCESSING`.

## Review Focus

1. Tentativa de manipulação de preço pelo frontend (o servidor deve recalcular sozinhas as somas a partir do catálogo e ignorar totais informados pelo cliente).
2. Concorrência entre cancelamento de pedido pelo cliente e aprovação de pagamento assíncrono (o pedido cancelado não deve ser reativado; gera alerta operacional).
3. Webhook duplicado ou reprocessado pela Outbox (a tabela `order_inbox_events` deve deduplicar o processamento sem erros ou duplicações).
4. Subpagamento ou discrepância de valor reportado pelo gateway (se `paidAmountCents != order.total_cents`, a transição automática para `PAID` deve ser bloqueada).
5. Limpeza do carrinho em compras concorrentes (não remover produtos adicionados após o fechamento daquele pedido específico).

---

## FASE 1: Domínio de Pedidos (`spec08`)

### Task 1: Schema de Dados do Módulo de Pedidos no Drizzle ORM
**Files:**
- Modify: `src/infra/schema.ts`
- Test: `tests/orders/orders-schema.test.ts`

- [x] **Step 1:** Escrever teste de tipagem e integridade do schema para as novas tabelas (`orders`, `order_items`, `order_history`, `order_idempotency`, `order_inbox_events`).
- [x] **Step 2:** Rodar `bun test tests/orders/orders-schema.test.ts` e confirmar que falha (RED).
- [x] **Step 3:** Adicionar as definições no `src/infra/schema.ts`:
  - `orders` com campos de endereço desnormalizados, `total_cents`, `currency`, `display_code` e índices.
  - `order_items` com `cart_item_id`, snapshot do produto, preços em centavos e `onDelete: 'restrict'`.
  - `order_history` com `record_type`, `from_status`, `to_status`, `reason`.
  - `order_idempotency` com chave composta `(idempotency_key, user_id)` e `status`.
  - `order_inbox_events` com índice único em `event_id`.
  - Relações do Drizzle.
- [x] **Step 4:** Rodar `bun test tests/orders/orders-schema.test.ts` e garantir que passa (GREEN).
- [x] **Step 5:** Aplicar migração no banco de dados local com `bun run db:push` (ou script equivalente de schema) e verificar integridade.

---

### Task 2: Utilitário de Parsing Decimal Seguro e Entidades de Domínio de Pedidos
**Files:**
- Create: `src/domains/orders/domain/order.entity.ts`
- Create: `src/domains/orders/utils/money.utils.ts`
- Test: `tests/orders/money-utils.test.ts`
- Test: `tests/orders/order-entity.test.ts`

- [x] **Step 1:** Criar testes unitários para conversão decimal determinística (`parseNumericPriceToCents`) testando arredondamentos, strings inválidas e números positivos.
- [x] **Step 2:** Rodar `bun test tests/orders/money-utils.test.ts` e confirmar falha (RED).
- [x] **Step 3:** Implementar `parseNumericPriceToCents` em `src/domains/orders/utils/money.utils.ts` convertendo strings `120.50` para `12050` sem float.
- [x] **Step 4:** Escrever testes de máquina de estados da entidade `Order` (transições válidas, estados terminais `CANCELLED` e `DELIVERED`, guarda contra pular etapas).
- [x] **Step 5:** Implementar a classe de domínio `Order` em `src/domains/orders/domain/order.entity.ts`.
- [x] **Step 6:** Rodar os testes e garantir 100% de aprovação (GREEN).

---

### Task 3: Repositório Drizzle e Caso de Uso: Criação de Pedido do Carrinho
**Files:**
- Create: `src/domains/orders/ports/order-repository.port.ts`
- Create: `src/domains/orders/adapters/drizzle-order.repository.ts`
- Create: `src/domains/orders/use-cases/create-order.use-case.ts`
- Test: `tests/orders/create-order.use-case.test.ts`

- [x] **Step 1:** Escrever testes unitários/integrados para o `CreateOrderUseCase`:
  - Rejeita carrinho vazio com erro de validação.
  - Rejeita se produto estiver em soft-delete no catálogo.
  - Valida endereço de entrega pertencente ao usuário.
  - Calcula soberanamente o total em centavos do servidor.
  - Persiste snapshot completo de itens (`cart_item_id`) e endereço.
  - Idempotência: responde com erro 409 em processamento concorrente e reutiliza pedido se já concluído.
- [x] **Step 2:** Rodar `bun test tests/orders/create-order.use-case.test.ts` e confirmar falha (RED).
- [x] **Step 3:** Implementar `DrizzleOrderRepository` e a porta `OrderRepositoryPort` com suporte a transação atômica.
- [x] **Step 4:** Implementar `CreateOrderUseCase` orquestrando leitura do carrinho, validação do catálogo, geração de `display_code` (ex: `#OV-XXXXXX`) e persistência.
- [x] **Step 5:** Rodar `bun test tests/orders/create-order.use-case.test.ts` e verificar que passa (GREEN).

---

### Task 4: Casos de Uso de Consulta e Cancelamento de Pedido pelo Cliente
**Files:**
- Create: `src/domains/orders/use-cases/get-order-details.use-case.ts`
- Create: `src/domains/orders/use-cases/list-user-orders.use-case.ts`
- Create: `src/domains/orders/use-cases/cancel-pending-order.use-case.ts`
- Test: `tests/orders/order-queries.test.ts`

- [x] **Step 1:** Escrever testes cobrindo Anti-IDOR (cliente não consulta pedido de outro cliente), listagem ordenada por data e cancelamento condicional de pedido em `PENDING_PAYMENT`.
- [x] **Step 2:** Rodar testes e confirmar falha (RED).
- [x] **Step 3:** Implementar `GetOrderDetailsUseCase`, `ListUserOrdersUseCase` e `CancelPendingOrderUseCase`.
- [x] **Step 4:** Rodar testes e validar aprovação (GREEN).

---

## FASE 2: Domínio de Pagamento (`spec07`)

### Task 5: Schema de Dados do Módulo de Pagamento no Drizzle ORM
**Files:**
- Modify: `src/infra/schema.ts`
- Test: `tests/payment/payment-schema.test.ts`

- [x] **Step 1:** Escrever teste de integridade para as tabelas `payment_attempts`, `payment_history`, `payment_outbox` e `payment_idempotency`.
- [x] **Step 2:** Rodar `bun test tests/payment/payment-schema.test.ts` e confirmar falha (RED).
- [x] **Step 3:** Declarar as tabelas em `src/infra/schema.ts` com FK física `payment_attempts.order_id REFERENCES orders(id) ON DELETE RESTRICT`.
- [x] **Step 4:** Rodar o teste e validar sucesso (GREEN).
- [x] **Step 5:** Atualizar banco com `bun run db:push`.

---

### Task 6: Adaptadores de Gateway de Pagamento (`MockPaymentAdapter` e `MercadoPagoPaymentAdapter`)
**Files:**
- Create: `src/domains/payment/ports/payment-gateway.port.ts`
- Create: `src/domains/payment/adapters/mock-payment.adapter.ts`
- Create: `src/domains/payment/adapters/mercadopago-payment.adapter.ts`
- Test: `tests/payment/payment-adapters.test.ts`

- [x] **Step 1:** Escrever testes unitários para a porta de gateway:
  - `MockPaymentAdapter`: gera Pix falso (30 min), Boleto falso (3 dias úteis), aprova `'tok_test_approved'` e recusa `'tok_test_declined'`.
  - `MercadoPagoPaymentAdapter`: formata payload com `date_of_expiration` em ISO 8601 (>= 30 min) e valida assinatura HMAC de webhook.
- [x] **Step 2:** Rodar testes e confirmar falha (RED).
- [x] **Step 3:** Implementar `MockPaymentAdapter` e `MercadoPagoPaymentAdapter`.
- [x] **Step 4:** Rodar testes e confirmar aprovação (GREEN).

---

### Task 7: Use Case de Iniciação de Pagamento com Persistência Prévia
**Files:**
- Create: `src/domains/payment/ports/payment-repository.port.ts`
- Create: `src/domains/payment/adapters/drizzle-payment.repository.ts`
- Create: `src/domains/payment/use-cases/create-payment-attempt.use-case.ts`
- Test: `tests/payment/create-payment-attempt.test.ts`

- [x] **Step 1:** Escrever testes garantindo:
  - Recuperação do snapshot soberano do pedido via `OrderSnapshotForPayment`.
  - Persistência prévia da tentativa com status `PENDING` antes de disparar HTTP ao gateway.
  - Incremento de `attempt_number` caso seja uma segunda tentativa após recusa.
  - Chamada HTTP fora do bloco de transação do banco.
- [x] **Step 2:** Rodar testes e verificar falha (RED).
- [x] **Step 3:** Implementar repositório e use case `CreatePaymentAttemptUseCase`.
- [x] **Step 4:** Rodar testes e assegurar aprovação (GREEN).

---

### Task 8: Webhook de Pagamento e Gravação na Transactional Outbox
**Files:**
- Create: `src/domains/payment/use-cases/process-payment-webhook.use-case.ts`
- Test: `tests/payment/process-webhook.test.ts`

- [x] **Step 1:** Escrever testes de processamento de webhook:
  - Validação de assinatura criptográfica.
  - Aprovação atômica: atualiza tentativa para `CONFIRMED` e grava evento `PAYMENT_CONFIRMED` na `payment_outbox` na mesma transação local.
  - Tratamento de expiração: se tentativa local expirou, marca como `PAID_AFTER_EXPIRATION` e não grava evento de confirmação direta.
  - Idempotência: requisições repetidas de webhook respondem 200 OK sem duplicar outbox.
- [x] **Step 2:** Rodar testes e verificar falha (RED).
- [x] **Step 3:** Implementar `ProcessPaymentWebhookUseCase`.
- [x] **Step 4:** Rodar testes e verificar aprovação (GREEN).

---

## FASE 3: Integração Assíncrona & Desacoplamento

### Task 9: Consumidor de Pagamento no Domínio de Pedidos (`OrderPaymentConsumer`)
**Files:**
- Create: `src/domains/orders/ports/order-payment-consumer.port.ts`
- Create: `src/domains/orders/ports/order-cart-cleaner.port.ts`
- Create: `src/domains/orders/use-cases/process-payment-confirmed.use-case.ts`
- Test: `tests/orders/process-payment-confirmed.test.ts`

- [x] **Step 1:** Escrever testes para o consumidor de pagamento:
  - Deduplica eventos utilizando a tabela `order_inbox_events`.
  - Rejeita e gera `RECONCILIATION_LOG` se `paidAmountCents != order.total_cents` ou `currency != 'BRL'`.
  - Atualiza condicionalmente o pedido de `PENDING_PAYMENT` para `PAID`.
  - Se o pedido estiver cancelado, NÃO reativa para `PAID` e grava `OPERATIONAL_ALERT`.
  - Dispara a exclusão seletiva no carrinho filtrando por `cartItemIds`.
- [x] **Step 2:** Rodar testes e verificar falha (RED).
- [x] **Step 3:** Implementar use cases e adaptadores de integração.
- [x] **Step 4:** Rodar testes e garantir aprovação (GREEN).

---

### Task 10: Worker Despachante da Outbox (`PaymentOutboxWorker`)
**Files:**
- Create: `src/domains/payment/workers/payment-outbox.worker.ts`
- Test: `tests/payment/outbox-worker.test.ts`

- [x] **Step 1:** Escrever testes para o worker da outbox:
  - Varre eventos com `status = 'PENDING'`.
  - Invoca o `OrderPaymentConsumerPort`.
  - Atualiza `status = 'PROCESSED'` com `processed_at = now()`.
  - Em caso de falha transitória, incrementa `retry_count` sem perder o evento.
- [x] **Step 2:** Rodar testes e confirmar falha (RED).
- [x] **Step 3:** Implementar `PaymentOutboxWorker`.
- [x] **Step 4:** Rodar testes e validar aprovação (GREEN).

---

## FASE 4: Endpoints HTTP e Interface de Checkout no Frontend

### Task 11: Rotas e Handlers da API de Pedidos e Pagamento
**Files:**
- Create: `src/domains/orders/orders.handlers.ts`
- Create: `src/domains/payment/payment.handlers.ts`
- Modify: `src/index.ts` (ou arquivo de rotas da aplicação)
- Test: `tests/e2e/orders-payment-api.test.ts`

- [x] **Step 1:** Escrever testes de integração HTTP via `supertest` ou `fetch` nativo do Bun cobrindo `POST /api/orders`, `GET /api/orders/:id`, `POST /api/payments` e `POST /api/payments/webhook`.
- [x] **Step 2:** Rodar testes e verificar falha (RED).
- [x] **Step 3:** Implementar handlers com validação Zod e proteção Anti-IDOR via middleware de autenticação.
- [x] **Step 4:** Rodar testes e garantir aprovação (GREEN).

---

### Task 12: Integração da Tela de Checkout React com Pix, Cartão e Pedido Concluído
**Files:**
- Modify: `src/web/pages/Checkout.tsx`
- Create: `src/web/pages/OrderConfirmation.tsx`
- Create: `src/web/pages/MyOrders.tsx`
- Test: Testes de componentes React ou validação E2E via browser.

- [x] **Step 1:** Adaptar a página `Checkout.tsx` para primeiro chamar `POST /api/orders` ao selecionar o endereço, recebendo o `orderId` e `displayCode`.
- [x] **Step 2:** Embutir o formulário de pagamento (Pix Copia e Cola / QR Code com polling, ou Cartão com token).
- [x] **Step 3:** Criar tela de confirmação de pedido exibindo código de rastreio legível (ex: `#OV-849201`) e snapshot dos itens comprados.
- [x] **Step 4:** Validar o fluxo interativo no navegador garantindo que o carrinho seja esvaziado seletivamente e o pedido apareça em "Meus Pedidos".
