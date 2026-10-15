import { z, ZodError } from 'zod';
import { db } from '../../infra/db';
import { getAuthenticatedUser } from '../identity/identity.handlers';
import { DrizzleOrderRepository } from './adapters/drizzle-order.repository';
import { CartRepository } from '../cart/cart.repository';
import { CatalogRepository } from '../catalog/catalog.repository';
import { AddressRepository } from '../address/address.repository';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';
import { GetOrderDetailsUseCase } from './use-cases/get-order-details.use-case';
import { ListUserOrdersUseCase } from './use-cases/list-user-orders.use-case';
import { CancelPendingOrderUseCase } from './use-cases/cancel-pending-order.use-case';
import * as schema from '../../infra/schema';
import { eq } from 'drizzle-orm';

const orderRepo = new DrizzleOrderRepository();
const cartRepo = new CartRepository();
const catalogRepo = new CatalogRepository();
const addressRepo = new AddressRepository();

const createOrderUseCase = new CreateOrderUseCase({
  orderRepository: orderRepo,
  cartRepository: cartRepo,
  catalogRepository: catalogRepo,
  addressRepository: addressRepo,
});

const getOrderDetailsUseCase = new GetOrderDetailsUseCase(orderRepo);
const listUserOrdersUseCase = new ListUserOrdersUseCase(orderRepo);
const cancelPendingOrderUseCase = new CancelPendingOrderUseCase(orderRepo);

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const createOrderSchema = z.object({
  shippingAddressId: z.string().uuid('ID do endereço inválido.'),
  recipientName: z.string().min(2, 'Nome do destinatário obrigatório.').optional(),
  idempotencyKey: z.string().optional(),
});

export class OrdersHandlers {
  // POST /api/orders
  async createOrder(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Faça login para finalizar o pedido.' }, 401);
    }

    try {
      const body = await req.json().catch(() => ({}));
      const parsed = createOrderSchema.parse(body);

      const headerIdempotencyKey = req.headers.get('Idempotency-Key') || req.headers.get('x-idempotency-key');
      const idempotencyKey = parsed.idempotencyKey || headerIdempotencyKey || crypto.randomUUID();

      const recipientName = parsed.recipientName || user.name;

      const result = await createOrderUseCase.execute({
        userId: user.id,
        addressId: parsed.shippingAddressId,
        recipientName,
        idempotencyKey,
      });

      return jsonResponse(
        {
          id: result.order.id,
          displayCode: result.order.displayCode,
          totalCents: result.order.totalCents,
          itemsCount: result.order.itemsCount,
          status: result.order.status,
          currency: result.order.currency,
          shippingRecipientName: result.order.shippingRecipientName,
          shippingCity: result.order.shippingCity,
          shippingState: result.order.shippingState,
          createdAt: result.order.createdAt,
        },
        201
      );
    } catch (err: any) {
      console.error('[createOrder error]:', err);
      if (err instanceof ZodError) {
        return jsonResponse({ error: 'Erro de validação.', details: err.issues.map((e) => e.message) }, 400);
      }
      return jsonResponse({ error: err.message || 'Erro ao processar pedido.' }, 400);
    }
  }

  // GET /api/orders
  async listOrders(req: Request): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado.' }, 401);
    }

    try {
      const orders = await listUserOrdersUseCase.execute(user.id);
      return jsonResponse({ orders: orders.map((o) => o.toJSON()) });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao listar pedidos.' }, 500);
    }
  }

  // GET /api/orders/:id
  async getOrderDetails(req: Request, orderId: string): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado.' }, 401);
    }

    try {
      const order = await getOrderDetailsUseCase.execute({
        orderId,
        requestingUserId: user.id,
        userRole: user.profile,
      });

      // Busca snapshots dos itens e histórico
      const items = await db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, order.id));

      const history = await db
        .select()
        .from(schema.orderHistory)
        .where(eq(schema.orderHistory.orderId, order.id));

      return jsonResponse({
        order: order.toJSON(),
        items,
        history,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Acesso não autorizado')) {
        return jsonResponse({ error: 'Acesso negado.' }, 403);
      }
      if (err.message && err.message.includes('não encontrado')) {
        return jsonResponse({ error: err.message }, 404);
      }
      return jsonResponse({ error: err.message || 'Erro ao consultar pedido.' }, 500);
    }
  }

  // POST /api/orders/:id/cancel
  async cancelOrder(req: Request, orderId: string): Promise<Response> {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado.' }, 401);
    }

    try {
      const body = await req.json().catch(() => ({}));
      const reason = body.reason || 'Cancelado a pedido do cliente.';

      await cancelPendingOrderUseCase.execute({
        orderId,
        userId: user.id,
        reason,
      });

      return jsonResponse({ success: true, message: 'Pedido cancelado com sucesso.' });
    } catch (err: any) {
      if (err.message && err.message.includes('Acesso não autorizado')) {
        return jsonResponse({ error: 'Acesso negado.' }, 403);
      }
      return jsonResponse({ error: err.message || 'Erro ao cancelar pedido.' }, 400);
    }
  }
}
