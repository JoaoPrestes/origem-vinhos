import { z, ZodError } from 'zod';
import { db } from '../../infra/db';
import { getAuthenticatedUser } from '../identity/identity.handlers';
import { DrizzlePaymentRepository } from './adapters/drizzle-payment.repository';
import { MockPaymentAdapter } from './adapters/mock-payment.adapter';
import { MercadoPagoPaymentAdapter } from './adapters/mercadopago-payment.adapter';
import { CreatePaymentAttemptUseCase } from './use-cases/create-payment-attempt.use-case';
import { ProcessPaymentWebhookUseCase } from './use-cases/process-payment-webhook.use-case';
import { DrizzleOrderRepository } from '../orders/adapters/drizzle-order.repository';
import { DrizzlePaymentOutboxRepository } from './adapters/drizzle-payment-outbox.repository';
import { PaymentOutboxWorker } from './workers/payment-outbox.worker';
import { OrderPaymentConsumerAdapter } from '../orders/adapters/order-payment-consumer.adapter';
import { ProcessPaymentConfirmedUseCase } from '../orders/use-cases/process-payment-confirmed.use-case';
import { DrizzleOrderCartCleanerAdapter } from '../orders/adapters/drizzle-order-cart-cleaner.adapter';
import { DrizzleOrderInboxRepository } from '../orders/adapters/drizzle-order-inbox.repository';
import * as schema from '../../infra/schema';
import { eq } from 'drizzle-orm';

const paymentRepo = new DrizzlePaymentRepository();
const orderRepo = new DrizzleOrderRepository();

const gatewayAdapter =
  process.env.PAYMENT_GATEWAY === 'mercadopago'
    ? new MercadoPagoPaymentAdapter({
        accessToken: process.env.MP_ACCESS_TOKEN || 'dummy_token',
        webhookSecret: process.env.MP_WEBHOOK_SECRET,
      })
    : new MockPaymentAdapter();

const createPaymentAttemptUseCase = new CreatePaymentAttemptUseCase({
  paymentRepository: paymentRepo,
  paymentGateway: gatewayAdapter,
  orderPort: {
    getOrderSnapshot: async (orderId: string) => {
      const order = await orderRepo.findById(orderId);
      if (!order) return null;

      const items = await db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, orderId));

      const cartItemIds = items
        .map((it) => it.cartItemId)
        .filter((id): id is string => Boolean(id));

      return {
        id: order.id,
        userId: order.userId,
        status: order.status,
        totalCents: order.totalCents,
        currency: order.currency,
        cartItemIds,
      };
    },
  },
});

const processWebhookUseCase = new ProcessPaymentWebhookUseCase(paymentRepo, gatewayAdapter);

// Worker para processamento imediato em webhook se configurado
const orderCartCleaner = new DrizzleOrderCartCleanerAdapter(db);
const orderInboxRepo = new DrizzleOrderInboxRepository(db);
const orderConsumer = new OrderPaymentConsumerAdapter(
  new ProcessPaymentConfirmedUseCase({
    orderRepository: orderRepo,
    cartCleaner: orderCartCleaner,
    inboxRepo: orderInboxRepo,
    itemsRepo: {
      findCartItemIdsByOrderId: async (orderId: string) => {
        const items = await db
          .select({ cartItemId: schema.orderItems.cartItemId })
          .from(schema.orderItems)
          .where(eq(schema.orderItems.orderId, orderId));
        return items
          .map((i) => i.cartItemId)
          .filter((id): id is string => Boolean(id));
      },
    },
  })
);
const outboxRepo = new DrizzlePaymentOutboxRepository(db);
const outboxWorker = new PaymentOutboxWorker({
  outboxRepo,
  consumer: orderConsumer,
});

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const createPaymentSchema = z.object({
  orderId: z.string().uuid('ID do pedido inválido.'),
  method: z.enum(['PIX', 'CREDIT_CARD', 'BOLETO']),
  idempotencyKey: z.string().optional(),
  cardToken: z.string().optional(),
  installments: z.number().int().min(1).max(12).optional(),
});

export class PaymentHandlers {
  // POST /api/payments
  async createPayment(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado.' }, 401);
    }

    try {
      const body = await req.json().catch(() => ({}));
      const parsed = createPaymentSchema.parse(body);

      const headerIdempotencyKey = req.headers.get('Idempotency-Key') || req.headers.get('x-idempotency-key');
      const idempotencyKey = parsed.idempotencyKey || headerIdempotencyKey || crypto.randomUUID();

      const { attempt } = await createPaymentAttemptUseCase.execute({
        orderId: parsed.orderId,
        userId: user.id,
        method: parsed.method,
        cardToken: parsed.cardToken,
        installments: parsed.installments,
      });

      // Se confirmado síncronamente (ex: Cartão de Crédito), dispara o outbox worker para consolidar pedido e limpar carrinho
      if (attempt.status === 'CONFIRMED') {
        try {
          await outboxWorker.processBatch();
        } catch (workerErr) {
          console.error('[PaymentHandlers] Error processing outbox batch:', workerErr);
        }
      }

      return jsonResponse(
        {
          attemptId: attempt.id,
          orderId: attempt.orderId,
          method: attempt.method,
          amountCents: attempt.amountCents,
          status: attempt.status,
          providerPaymentId: attempt.providerPaymentId,
          pixQrCode: attempt.qrCodePix,
          pixQrCodeBase64: attempt.qrCodePixUrl,
          boletoBarcode: attempt.boletoBarcode,
          boletoUrl: attempt.boletoUrl,
          expiresAt: attempt.expiresAt,
        },
        201
      );
    } catch (err: any) {
      console.error('[createPayment error]:', err);
      if (err instanceof ZodError) {
        return jsonResponse({ error: 'Erro de validação.', details: err.issues.map((e) => e.message) }, 400);
      }
      return jsonResponse({ error: err.message || 'Erro ao processar pagamento.' }, 400);
    }
  }

  // GET /api/payments/:attemptId/status
  async getPaymentStatus(req: Request, attemptId: string): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado.' }, 401);
    }

    try {
      const attempt = await paymentRepo.findAttemptById(attemptId);
      if (!attempt) {
        return jsonResponse({ error: 'Tentativa de pagamento não encontrada.' }, 404);
      }

      // Buscar o pedido para checar integridade Anti-IDOR
      const order = await orderRepo.findById(attempt.orderId);
      if (order && order.userId !== user.id && user.profile !== 'Admin') {
        return jsonResponse({ error: 'Acesso negado.' }, 403);
      }

      const isExpired = new Date() > attempt.expiresAt && attempt.status === 'PENDING';

      return jsonResponse({
        attemptId: attempt.id,
        orderId: attempt.orderId,
        status: isExpired ? 'EXPIRED' : attempt.status,
        expiresAt: attempt.expiresAt,
        isExpired,
      });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao consultar status de pagamento.' }, 500);
    }
  }

  // POST /api/payments/webhook
  async handleWebhook(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    try {
      const headersRecord: Record<string, string> = {};
      req.headers.forEach((val, key) => {
        headersRecord[key.toLowerCase()] = val;
      });

      const rawBody = await req.text();
      let body: any = {};
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = {};
      }

      await processWebhookUseCase.execute({
        headers: headersRecord,
        body,
        rawBody,
      });

      // Dispara o processamento imediato da outbox para garantia de consistência e limpeza do carrinho
      if (process.env.NODE_ENV !== 'test') {
        try {
          await outboxWorker.processBatch();
        } catch (errWorker) {
          console.error('[Webhook] Outbox worker batch error:', errWorker);
        }
      }

      return jsonResponse({ received: true }, 200);
    } catch (err: any) {
      if (err.message && err.message.includes('Assinatura de webhook inválida')) {
        return jsonResponse({ error: 'Unauthorized signature' }, 401);
      }
      return jsonResponse({ error: err.message || 'Erro ao processar webhook' }, 400);
    }
  }
}
