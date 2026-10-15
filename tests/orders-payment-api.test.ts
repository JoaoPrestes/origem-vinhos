import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '../src/infra/db';
import { users, products, cartItems, addresses, favorites, orders, orderItems, orderHistory, paymentAttempts, paymentHistory, paymentOutbox, orderInboxEvents, orderIdempotency, paymentIdempotency } from '../src/infra/schema';
import { AuthService } from '../src/domains/identity/auth.service';
import { OrdersHandlers } from '../src/domains/orders/orders.handlers';
import { PaymentHandlers } from '../src/domains/payment/payment.handlers';
import { PaymentOutboxWorker } from '../src/domains/payment/workers/payment-outbox.worker';
import { DrizzlePaymentOutboxRepository } from '../src/domains/payment/adapters/drizzle-payment-outbox.repository';
import { OrderPaymentConsumerAdapter } from '../src/domains/orders/adapters/order-payment-consumer.adapter';
import { ProcessPaymentConfirmedUseCase } from '../src/domains/orders/use-cases/process-payment-confirmed.use-case';
import { DrizzleOrderRepository } from '../src/domains/orders/adapters/drizzle-order.repository';
import { DrizzleOrderCartCleanerAdapter } from '../src/domains/orders/adapters/drizzle-order-cart-cleaner.adapter';
import { DrizzleOrderInboxRepository } from '../src/domains/orders/adapters/drizzle-order-inbox.repository';
import { eq } from 'drizzle-orm';

const authService = new AuthService();
const ordersHandlers = new OrdersHandlers();
const paymentHandlers = new PaymentHandlers();

describe('E2E / Integration: Orders & Payment API (spec07 & spec08)', () => {
  let customerId: string;
  let customerCookie: string;
  let otherCustomerId: string;
  let otherCustomerCookie: string;
  let productId: string;
  let addressId: string;
  let createdOrderId: string;
  let createdCartItemId: string;

  beforeAll(async () => {
    // Limpeza de tabelas para isolamento
    await db.delete(orderInboxEvents);
    await db.delete(paymentOutbox);
    await db.delete(paymentHistory);
    await db.delete(paymentAttempts);
    await db.delete(paymentIdempotency);
    await db.delete(orderHistory);
    await db.delete(orderItems);
    await db.delete(orderIdempotency);
    await db.delete(orders);
    await db.delete(cartItems);
    await db.delete(addresses);
    await db.delete(favorites);
    await db.delete(products);
    await db.delete(users);

    // 1. Criar cliente principal
    const [user1] = await db
      .insert(users)
      .values({
        name: 'Cliente E2E Pedidos',
        email: 'cliente.pedidos@origem.com',
        password: 'password123',
        birthDate: new Date('1990-01-01'),
        profile: 'Customer',
      })
      .returning();
    customerId = user1!.id;
    customerCookie = `session_token=${authService.generateSessionToken(customerId)}`;

    // 2. Criar segundo cliente (para teste Anti-IDOR)
    const [user2] = await db
      .insert(users)
      .values({
        name: 'Cliente Intruso',
        email: 'intruso@origem.com',
        password: 'password123',
        birthDate: new Date('1992-05-10'),
        profile: 'Customer',
      })
      .returning();
    otherCustomerId = user2!.id;
    otherCustomerCookie = `session_token=${authService.generateSessionToken(otherCustomerId)}`;

    // 3. Cadastrar produto de teste no catálogo
    const [prod] = await db
      .insert(products)
      .values({
        name: 'Cabernet Sauvignon Gran Reserva',
        description: 'Vinho tinto encorpado envelhecido em carvalho francês.',
        price: '189.90',
        image: '/images/cabernet.jpg',
        type: 'Tinto',
        grape: 'Cabernet Sauvignon',
        country: 'Brasil',
        harvest: 2020,
        alcohol: '13.50',
      })
      .returning();
    productId = prod!.id;

    // 4. Cadastrar endereço de entrega para o cliente 1
    const [addr] = await db
      .insert(addresses)
      .values({
        userId: customerId,
        zipCode: '01001-000',
        street: 'Praça da Sé',
        number: '100',
        complement: 'Apto 12',
        neighborhood: 'Sé',
        city: 'São Paulo',
        state: 'SP',
        label: 'Casa Principal',
        isDefault: true,
      })
      .returning();
    addressId = addr!.id;

    // 5. Adicionar produto ao carrinho
    const [cItem] = await db
      .insert(cartItems)
      .values({
        userId: customerId,
        productId: productId,
        quantity: 2,
      })
      .returning();
    createdCartItemId = cItem!.id;
  });

  afterAll(async () => {
    await db.delete(orderInboxEvents);
    await db.delete(paymentOutbox);
    await db.delete(paymentHistory);
    await db.delete(paymentAttempts);
    await db.delete(paymentIdempotency);
    await db.delete(orderHistory);
    await db.delete(orderItems);
    await db.delete(orderIdempotency);
    await db.delete(orders);
    await db.delete(cartItems);
    await db.delete(addresses);
    await db.delete(favorites);
    await db.delete(products);
    await db.delete(users);
  });

  test('POST /api/orders: Deve criar pedido a partir do carrinho e endereço', async () => {
    const req = new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: customerCookie,
        'Idempotency-Key': 'idemp-order-001',
      },
      body: JSON.stringify({
        shippingAddressId: addressId,
        recipientName: 'Cliente E2E Pedidos',
      }),
    });

    const res = await ordersHandlers.createOrder(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.displayCode).toMatch(/^#OV-[0-9]{6}$/);
    expect(data.totalCents).toBe(37980); // 189.90 * 2 = 379.80 -> 37980 centavos
    expect(data.itemsCount).toBe(2);
    expect(data.status).toBe('PENDING_PAYMENT');

    createdOrderId = data.id;
  });

  test('GET /api/orders/:id: Deve retornar detalhes do pedido e bloquear Anti-IDOR', async () => {
    // 1. Cliente dono do pedido acessa com sucesso
    const validReq = new Request(`http://localhost/api/orders/${createdOrderId}`, {
      method: 'GET',
      headers: { Cookie: customerCookie },
    });
    const validRes = await ordersHandlers.getOrderDetails(validReq, createdOrderId);
    const validData = await validRes.json();

    expect(validRes.status).toBe(200);
    expect(validData.order.id).toBe(createdOrderId);
    expect(validData.items.length).toBe(1);
    expect(validData.items[0].productName).toBe('Cabernet Sauvignon Gran Reserva');
    expect(validData.items[0].unitPriceCents).toBe(18990);
    expect(validData.items[0].cartItemId).toBe(createdCartItemId);

    // 2. Cliente intruso tenta acessar o pedido de outro usuário (Anti-IDOR)
    const idorReq = new Request(`http://localhost/api/orders/${createdOrderId}`, {
      method: 'GET',
      headers: { Cookie: otherCustomerCookie },
    });
    const idorRes = await ordersHandlers.getOrderDetails(idorReq, createdOrderId);
    expect(idorRes.status).toBe(403);
  });

  test('POST /api/payments: Deve gerar tentativa de pagamento Pix com QR Code', async () => {
    const req = new Request('http://localhost/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: customerCookie,
        'Idempotency-Key': 'idemp-pay-001',
      },
      body: JSON.stringify({
        orderId: createdOrderId,
        method: 'PIX',
      }),
    });

    const res = await paymentHandlers.createPayment(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.attemptId).toBeDefined();
    expect(data.orderId).toBe(createdOrderId);
    expect(data.method).toBe('PIX');
    expect(data.amountCents).toBe(37980);
    expect(data.status).toBe('PENDING');
    expect(data.pixQrCode).toBeDefined();
    expect(data.pixQrCodeBase64).toBeDefined();
    expect(data.expiresAt).toBeDefined();
  });

  test('POST /api/payments/webhook & Outbox: Deve confirmar pagamento, mudar pedido para PAID e limpar carrinho seletivamente', async () => {
    // 1. Buscar a tentativa de pagamento criada para obter o providerPaymentId
    const [attempt] = await db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.orderId, createdOrderId))
      .limit(1);

    expect(attempt).toBeDefined();

    // 2. Dispara webhook do gateway simulando aprovação
    const webhookReq = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'mock-dev-signature',
      },
      body: JSON.stringify({
        action: 'payment.updated',
        data: {
          id: attempt!.providerPaymentId,
        },
      }),
    });

    const webhookRes = await paymentHandlers.handleWebhook(webhookReq);
    expect(webhookRes.status).toBe(200);

    // 3. Verifica se a tentativa foi marcada como CONFIRMED e se o evento foi gravado na Outbox
    const [updatedAttempt] = await db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.orderId, createdOrderId))
      .limit(1);
    expect(updatedAttempt!.status).toBe('CONFIRMED');

    // 4. Executa o worker da outbox para despachar para o módulo de pedidos
    const orderRepo = new DrizzleOrderRepository();
    const cartCleaner = new DrizzleOrderCartCleanerAdapter(db);
    const inboxRepo = new DrizzleOrderInboxRepository(db);
    const processConfirmedUseCase = new ProcessPaymentConfirmedUseCase({
      orderRepository: orderRepo,
      cartCleaner,
      inboxRepo,
      itemsRepo: {
        findCartItemIdsByOrderId: async (orderId: string) => {
          const items = await db
            .select({ cartItemId: orderItems.cartItemId })
            .from(orderItems)
            .where(eq(orderItems.orderId, orderId));
          return items
            .map((i) => i.cartItemId)
            .filter((id): id is string => Boolean(id));
        },
      },
    });
    const consumerAdapter = new OrderPaymentConsumerAdapter(processConfirmedUseCase);
    const outboxRepo = new DrizzlePaymentOutboxRepository(db);
    const worker = new PaymentOutboxWorker({
      outboxRepo,
      consumer: consumerAdapter,
    });

    const dispatchResult = await worker.processBatch(10);
    expect(dispatchResult.processedCount).toBeGreaterThanOrEqual(1);

    // 5. Verifica se o pedido transitou para PAID
    const paidOrder = await orderRepo.findById(createdOrderId);
    expect(paidOrder!.status).toBe('PAID');

    // 6. Verifica se o item comprado foi excluído seletivamente do carrinho
    const remainingCartItems = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, customerId));
    expect(remainingCartItems.length).toBe(0);
  });
});
